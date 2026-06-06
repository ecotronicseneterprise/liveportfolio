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
    const plan: 'basic' | 'pro' =
      planCode === process.env.PAYSTACK_BASIC_PLAN_CODE ? 'basic' : 'pro'

    const subscriptionCode = data.subscription_code as string
    const customerCode = customer?.customer_code as string
    const nextPaymentDate = data.next_payment_date as string

    // Derive user_id from customer email — Paystack doesn't pass it directly
    const customerEmail = customer?.email as string
    if (!customerEmail) {
      console.log('[paystack-webhook] subscription.create: no customer email')
      return NextResponse.json({ received: true })
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, slug')
      .eq('email', customerEmail)
      .single()

    if (!userData) {
      console.log('[paystack-webhook] subscription.create: no user found for email', customerEmail)
      return NextResponse.json({ received: true })
    }

    const user_id = userData.id

    // Insert subscription row (idempotent — ignore conflict on subscription_code)
    await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id,
          plan,
          status: 'active',
          paystack_subscription_code: subscriptionCode,
          paystack_customer_code: customerCode,
          started_at: new Date().toISOString(),
          expires_at: nextPaymentDate
            ? new Date(nextPaymentDate).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'paystack_subscription_code' }
      )

    // Update users.plan → keeps Realtime celebration flow working
    await supabaseAdmin
      .from('users')
      .update({ plan, published_at: new Date().toISOString() })
      .eq('id', user_id)

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
    const data = event.data
    const subscriptionCode = data.subscription_code as string

    if (subscriptionCode) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('paystack_subscription_code', subscriptionCode)

      console.log('[paystack-webhook] subscription.disable: cancelled', subscriptionCode)
    }

    // Do NOT change users.plan — user keeps access until expires_at
    return NextResponse.json({ received: true })
  }

  // ─── charge.success ─────────────────────────────────────────────────────────
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const data = event.data
  const reference = data.reference as string
  const amount = data.amount as number

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

      console.log('[paystack-webhook] charge.success (renewal): extended', subscriptionCode)
    }

    return NextResponse.json({ received: true })
  }

  // ── Legacy: one-time $5 payments — remove after all existing users migrate to subscriptions ──
  const rawMeta = (data.metadata as Record<string, unknown>) || {}
  let user_id: string | undefined
  let plan: string | undefined

  if (rawMeta.user_id) {
    user_id = rawMeta.user_id as string
    plan = rawMeta.plan as string
  } else if (Array.isArray(rawMeta.custom_fields)) {
    const fields = rawMeta.custom_fields as { variable_name: string; value: string }[]
    user_id = fields.find(f => f.variable_name === 'user_id')?.value
    plan = fields.find(f => f.variable_name === 'plan')?.value
  }

  if (!user_id && reference) {
    console.log('[paystack-webhook] metadata missing user_id, reference:', reference, 'raw meta:', JSON.stringify(rawMeta))
  }

  if (!user_id || plan !== 'pro') {
    console.log('[paystack-webhook] skipping: user_id=', user_id, 'plan=', plan)
    return NextResponse.json({ received: true })
  }

  // Idempotency — ignore if already processed
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('ls_order_id', reference)
    .single()

  if (existing) {
    return NextResponse.json({ received: true })
  }

  // Update user plan (triggers Supabase Realtime → preview page shows celebration)
  await supabaseAdmin
    .from('users')
    .update({ plan, published_at: new Date().toISOString() })
    .eq('id', user_id)

  // Record payment for idempotency
  await supabaseAdmin
    .from('payments')
    .insert({
      user_id,
      ls_order_id: reference,
      product_tier: plan,
      amount_cents: amount,
    })

  // Send confirmation email
  if (process.env.RESEND_API_KEY) {
    try {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, slug')
        .eq('id', user_id)
        .single()

      if (userData) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
        const portfolioUrl = `${appUrl}/${userData.slug}`
        await sendEmail({
          to: userData.email,
          ...emailTemplates.portfolioLive(portfolioUrl),
        })
      }
    } catch {
      // Don't fail the webhook if email sending fails
    }
  }

  return NextResponse.json({ received: true })
}
