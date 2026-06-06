import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
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

    const TEST_PLAN_CODE = 'PLN_gzi13ks4vajcdhx' // ₦500 test plan — maps to basic
    const plan: 'basic' | 'pro' =
      planCode === process.env.PAYSTACK_BASIC_PLAN_CODE || planCode === TEST_PLAN_CODE
        ? 'basic'
        : 'pro'

    const nextPaymentDate = data.next_payment_date as string

    // Derive user_id from customer email — Paystack doesn't pass it directly
    if (!customerEmail) {
      console.error('[webhook] subscription.create: missing customer email')
      return NextResponse.json({ received: true })
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

    // Insert subscription row
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

    // Update users.plan → keeps Realtime celebration flow working
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ plan, published_at: new Date().toISOString() })
      .eq('id', user_id)
    if (updateError) console.error('[webhook] subscription.create: failed to update user plan', updateError.message)

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

  // Distinguish recurring subscription renewal from one-time charge
  const chargePlan = data.plan as Record<string, unknown> | undefined
  if (chargePlan && chargePlan.plan_code) {
    // ── Recurring renewal ──
    const subscriptionCode = data.subscription_code as string
    const paidAt = data.paid_at as string

    if (subscriptionCode) {
      const expiresAt = new Date(
        (paidAt ? new Date(paidAt) : new Date()).getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString()

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active', expires_at: expiresAt })
        .eq('paystack_subscription_code', subscriptionCode)

    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
