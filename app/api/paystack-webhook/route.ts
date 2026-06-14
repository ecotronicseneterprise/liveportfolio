import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not set — rejecting request')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')

  if (hash !== req.headers.get('x-paystack-signature')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ received: true })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // ─── subscription.create ────────────────────────────────────────────────────
  if (event.event === 'subscription.create') {
    const data = event.data
    const planData = data.plan as Record<string, unknown>
    const customer = data.customer as Record<string, unknown>

    const planCode = planData?.plan_code as string
    const customerEmail = customer?.email as string
    const subscriptionCode = data.subscription_code as string

    // FIX 9: Test plan code from env var (never hardcoded)
    const TEST_PLAN_CODE = process.env.PAYSTACK_TEST_PLAN_CODE || ''
    const isTestPlan = TEST_PLAN_CODE && planCode === TEST_PLAN_CODE
    // FIX 9: Test plan only accepted for the owner's email — never arbitrary users
    const TEST_EMAIL_WHITELIST = (process.env.PAYSTACK_TEST_EMAIL || '').toLowerCase()
    if (isTestPlan && customerEmail.toLowerCase() !== TEST_EMAIL_WHITELIST) {
      console.warn('[webhook] test plan rejected for non-whitelisted email:', customerEmail)
      return NextResponse.json({ received: true })
    }
    const plan: 'basic' | 'pro' =
      planCode === process.env.PAYSTACK_BASIC_PLAN_CODE || isTestPlan
        ? 'basic'
        : 'pro'

    const nextPaymentDate = data.next_payment_date as string

    // Derive user_id from customer email — Paystack doesn't pass it directly
    if (!customerEmail) {
      console.error('[webhook] subscription.create: missing customer email')
      return NextResponse.json({ received: true })
    }

    // Idempotency — skip if this subscription was already processed
    if (subscriptionCode) {
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('ls_order_id', subscriptionCode)
        .maybeSingle()
      if (existing) {
        console.log('[webhook] subscription.create: duplicate event, skipping:', subscriptionCode)
        return NextResponse.json({ received: true })
      }
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, slug')
      .eq('email', customerEmail)
      .single()

    if (!userData) {
      console.error('[webhook] subscription.create: no user found for planCode', planCode)
      return NextResponse.json({ received: true })
    }

    const user_id = userData.id

    // Insert subscription row — skip if a row was already inserted in the last 5 min
    // (charge.success and subscription.create both fire for the same payment)
    const { data: recentSubCreate } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .maybeSingle()

    if (!recentSubCreate) {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id,
          plan,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: nextPaymentDate
            ? new Date(nextPaymentDate).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
    } else {
      console.log('[webhook] subscription.create: skipping duplicate subscriptions insert:', user_id)
    }

    // Insert payments row for audit trail and idempotency
    if (subscriptionCode) {
      await supabaseAdmin.from('payments').insert({
        user_id,
        ls_order_id: subscriptionCode,
        product_tier: plan,
        amount_cents: (planData?.amount as number) ?? 0,
      })
    }

    // Update users.plan → keeps Realtime celebration flow working
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ plan, published_at: new Date().toISOString() })
      .eq('id', user_id)
    if (updateError) console.error('[webhook] subscription.create: failed to update user plan', updateError.message)

    // Bust ISR cache so the newly-published portfolio renders immediately
    revalidatePath(`/portfolio/${userData.slug}`)

    // Send confirmation email
    if (process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
        const portfolioUrl = `${appUrl}/${userData.slug}`
        await sendEmail({
          to: userData.email,
          ...emailTemplates.portfolioLive(portfolioUrl),
        })
      } catch {
        // Don't fail the webhook if email sending fails
      }
    }

    return NextResponse.json({ received: true })
  }

  // ─── subscription.disable ───────────────────────────────────────────────────
  if (event.event === 'subscription.disable') {
    // Do NOT change users.plan — user keeps access until expires_at
    return NextResponse.json({ received: true })
  }

  // ─── charge.success ─────────────────────────────────────────────────────────
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const data = event.data

  // charge.success fires for both first subscription payment and renewals
  // Reference format: lp-{portfolioId}-{tier}-{timestamp}
  const reference = data.reference as string
  const customerData = data.customer as Record<string, unknown>
  const customerEmail = customerData?.email as string
  if (!customerEmail) return NextResponse.json({ received: true })

  // Idempotency — skip if this reference was already processed
  if (reference) {
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('ls_order_id', reference)
      .maybeSingle()
    if (existing) {
      console.log('[webhook] charge.success: duplicate event, skipping:', reference)
      return NextResponse.json({ received: true })
    }
  }

  // Determine plan tier from reference string (format: lp-{portfolioId}-{tier}-{timestamp})
  // Reference is set by us in UpgradeModal — reliable across all payment methods
  const plan: 'basic' | 'pro' = reference?.includes('-pro-') ? 'pro' : 'basic'

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, email, slug, plan')
    .eq('email', customerEmail)
    .single()

  if (!userData) return NextResponse.json({ received: true })

  // Skip if already activated (belt-and-braces — payments check above is primary guard)
  if (userData.plan !== 'unpublished') return NextResponse.json({ received: true })

  // Insert subscription row — skip if a row was already inserted in the last 5 min
  // (charge.success and subscription.create both fire for the same payment)
  const { data: recentSubCharge } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userData.id)
    .eq('status', 'active')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .maybeSingle()

  if (!recentSubCharge) {
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userData.id,
        plan,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
  } else {
    console.log('[webhook] charge.success: skipping duplicate subscriptions insert:', userData.id)
  }

  // Insert payments row for audit trail and idempotency
  await supabaseAdmin.from('payments').insert({
    user_id: userData.id,
    ls_order_id: reference,
    product_tier: plan,
    amount_cents: (data.amount as number) ?? 0,
  })

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ plan, published_at: new Date().toISOString() })
    .eq('id', userData.id)
  if (updateError) console.error('[webhook] charge.success: failed to update user plan', updateError.message)

  // Bust ISR cache so the newly-published portfolio renders immediately
  revalidatePath(`/portfolio/${userData.slug}`)

  if (process.env.RESEND_API_KEY) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
      await sendEmail({
        to: userData.email,
        ...emailTemplates.portfolioLive(`${appUrl}/${userData.slug}`),
      })
    } catch { /* never fail the webhook */ }
  }

  return NextResponse.json({ received: true })
}
