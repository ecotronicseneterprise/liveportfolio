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

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const data = event.data
  const reference = data.reference as string
  const amount = data.amount as number

  // Paystack can send metadata as direct keys OR as custom_fields array
  // Handle both to be safe
  const rawMeta = (data.metadata as Record<string, unknown>) || {}
  let user_id: string | undefined
  let plan: string | undefined

  if (rawMeta.user_id) {
    // Direct key format (used by PaystackPop inline)
    user_id = rawMeta.user_id as string
    plan = rawMeta.plan as string
  } else if (Array.isArray(rawMeta.custom_fields)) {
    // custom_fields array format
    const fields = rawMeta.custom_fields as { variable_name: string; value: string }[]
    user_id = fields.find(f => f.variable_name === 'user_id')?.value
    plan = fields.find(f => f.variable_name === 'plan')?.value
  }

  // Also try reference parsing as last resort: ref format is lp-{portfolioId}-pro-{timestamp}
  if (!user_id && reference) {
    console.log('[paystack-webhook] metadata missing user_id, reference:', reference, 'raw meta:', JSON.stringify(rawMeta))
  }

  if (!user_id || plan !== 'pro') {
    console.log('[paystack-webhook] skipping: user_id=', user_id, 'plan=', plan)
    return NextResponse.json({ received: true })
  }

  const supabaseAdmin = getSupabaseAdmin()

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

  // Always return 200 — Paystack retries on non-200
  return NextResponse.json({ received: true })
}
