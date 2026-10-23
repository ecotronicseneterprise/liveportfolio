import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'

type Plan = 'basic' | 'pro'
type Admin = ReturnType<typeof getSupabaseAdmin>

const YEAR_MS = 365 * 24 * 60 * 60 * 1000
const RENEWAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

// Tier comes ONLY from the Paystack plan code — never from the client-supplied reference.
// Unknown or missing codes return null and the event is ignored.
function resolvePlan(planCode: string | undefined, email: string): Plan | null {
  if (!planCode) return null

  const basic = process.env.PAYSTACK_BASIC_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_BASIC_PLAN_CODE
  const pro = process.env.PAYSTACK_PRO_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN_CODE
  const test = process.env.PAYSTACK_TEST_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_TEST_PLAN_CODE

  if (basic && planCode === basic) return 'basic'
  if (pro && planCode === pro) return 'pro'

  // Test plan only counts for the owner's email — never arbitrary users
  if (test && planCode === test) {
    const allowed = (process.env.PAYSTACK_TEST_EMAIL || '').toLowerCase()
    if (allowed && email.toLowerCase() === allowed) return 'basic'
    console.warn('[webhook] test plan rejected for non-whitelisted email:', email)
    return null
  }

  console.error('[webhook] unknown plan code, ignoring:', planCode)
  return null
}

function planCodeOf(data: Record<string, unknown>): string | undefined {
  const p = (data.plan_object ?? data.plan) as Record<string, unknown> | string | undefined
  if (typeof p === 'string') return p || undefined
  return (p?.plan_code as string | undefined) || undefined
}

async function findUser(supabaseAdmin: Admin, email: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, slug')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return data
}

// subscriptions.expires_at is the source of truth; users.plan is a cache kept in sync here
// and downgraded by /api/cron/expire-plans.
// `absoluteExpiry` (subscription.create) sets the date outright.
// Without it (charge.success) the call is first payment, renewal, or upgrade:
//   - same plan, expiry still > 30 days away  → duplicate/first-payment echo, leave dates alone
//   - same plan, expiry near/past             → renewal, extend one year from the later of now/expiry
//   - different plan or no subscription       → new term from now
async function applyEntitlement(
  supabaseAdmin: Admin,
  userId: string,
  plan: Plan,
  absoluteExpiry?: Date,
) {
  const now = Date.now()

  const { data: current } = await supabaseAdmin
    .from('subscriptions')
    .select('id, plan, expires_at')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let expiresAt: Date
  if (absoluteExpiry && !isNaN(absoluteExpiry.getTime())) {
    expiresAt = absoluteExpiry
  } else if (current && current.plan === plan && current.expires_at) {
    const currentExpiry = new Date(current.expires_at).getTime()
    if (currentExpiry - now > RENEWAL_WINDOW_MS) {
      expiresAt = new Date(currentExpiry)
    } else {
      expiresAt = new Date(Math.max(currentExpiry, now) + YEAR_MS)
    }
  } else {
    expiresAt = new Date(now + YEAR_MS)
  }

  if (current) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ plan, status: 'active', expires_at: expiresAt.toISOString() })
      .eq('id', current.id)
    if (error) console.error('[webhook] subscription update failed:', error.message)
  } else {
    const { error } = await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      plan,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    if (error) console.error('[webhook] subscription insert failed:', error.message)
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ plan, published_at: new Date().toISOString() })
    .eq('id', userId)
  if (updateError) console.error('[webhook] failed to update user plan:', updateError.message)

  // true only for the first activation — callers use it to avoid emailing on renewals/echo events
  return !current
}

async function recordPayment(
  supabaseAdmin: Admin,
  userId: string,
  reference: string,
  plan: Plan,
  amount: number,
) {
  const { error } = await supabaseAdmin.from('payments').insert({
    user_id: userId,
    ls_order_id: reference,
    product_tier: plan,
    amount_cents: amount,
  })
  if (error) console.error('[webhook] payment insert failed:', error.message)
}

async function alreadyProcessed(supabaseAdmin: Admin, reference: string) {
  const { data } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('ls_order_id', reference)
    .maybeSingle()
  return !!data
}

async function notifyLive(user: { email: string; slug: string }) {
  if (!process.env.RESEND_API_KEY) return
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
    await sendEmail({
      to: user.email,
      ...emailTemplates.portfolioLive(`${appUrl}/${user.slug}`),
    })
  } catch {
    // Never fail the webhook because of email
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not set — rejecting request')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex')
  const sig = req.headers.get('x-paystack-signature') || ''
  const hashBuf = Buffer.from(hash)
  const sigBuf = Buffer.from(sig)
  if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ received: true })
  }

  // Always 200 after signature check — Paystack retries on non-200
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const data = event.data || {}
    const customer = data.customer as Record<string, unknown> | undefined
    const customerEmail = (customer?.email as string | undefined)?.trim()

    // ─── subscription.create ──────────────────────────────────────────────────
    if (event.event === 'subscription.create') {
      const subscriptionCode = data.subscription_code as string | undefined
      if (!customerEmail) return NextResponse.json({ received: true })

      const plan = resolvePlan(planCodeOf(data), customerEmail)
      if (!plan) return NextResponse.json({ received: true })

      if (subscriptionCode && (await alreadyProcessed(supabaseAdmin, subscriptionCode))) {
        return NextResponse.json({ received: true })
      }

      const user = await findUser(supabaseAdmin, customerEmail)
      if (!user) {
        console.error('[webhook] subscription.create: no user for email')
        return NextResponse.json({ received: true })
      }

      const next = data.next_payment_date as string | undefined
      const isNew = await applyEntitlement(supabaseAdmin, user.id, plan, next ? new Date(next) : undefined)

      if (subscriptionCode) {
        const planData = data.plan as Record<string, unknown> | undefined
        await recordPayment(supabaseAdmin, user.id, subscriptionCode, plan, (planData?.amount as number) ?? 0)
      }

      revalidatePath(`/portfolio/${user.slug}`)
      revalidatePath(`/${user.slug}`)
      if (isNew) await notifyLive(user)
      return NextResponse.json({ received: true })
    }

    // ─── subscription.disable / not_renew ─────────────────────────────────────
    // Access continues until expires_at; the expiry cron downgrades afterwards.
    if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
      if (customerEmail) {
        const user = await findUser(supabaseAdmin, customerEmail)
        if (user) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', user.id)
            .eq('status', 'active')
        }
      }
      return NextResponse.json({ received: true })
    }

    // ─── charge.success (first payment, renewal, upgrade) ─────────────────────
    if (event.event === 'charge.success') {
      const reference = data.reference as string | undefined
      if (!customerEmail || !reference) return NextResponse.json({ received: true })

      if (await alreadyProcessed(supabaseAdmin, reference)) {
        return NextResponse.json({ received: true })
      }

      // Not a plan transaction (or unknown plan) → nothing to grant
      const plan = resolvePlan(planCodeOf(data), customerEmail)
      if (!plan) return NextResponse.json({ received: true })

      const user = await findUser(supabaseAdmin, customerEmail)
      if (!user) {
        console.error('[webhook] charge.success: no user for email')
        return NextResponse.json({ received: true })
      }

      const isNew = await applyEntitlement(supabaseAdmin, user.id, plan)
      await recordPayment(supabaseAdmin, user.id, reference, plan, (data.amount as number) ?? 0)

      revalidatePath(`/portfolio/${user.slug}`)
      revalidatePath(`/${user.slug}`)
      if (isNew) await notifyLive(user)
    }
  } catch (err) {
    console.error('[paystack-webhook] unhandled error:', err)
  }

  return NextResponse.json({ received: true })
}
