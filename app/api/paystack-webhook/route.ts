import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
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

  // Only process successful charges
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const data = event.data
  const reference = data.reference as string
  const amount = data.amount as number
  const metadata = (data.metadata as Record<string, string>) || {}
  const { user_id, plan } = metadata

  if (!user_id || !plan || !['launch', 'professional'].includes(plan)) {
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

  // Update user plan (triggers Supabase Realtime → preview page removes watermark)
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

  // Always 200 — Paystack retries on non-200
  return NextResponse.json({ received: true })
}
