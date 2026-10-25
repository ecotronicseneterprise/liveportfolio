import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { CURRENCY, PRICES_KOBO, isTier } from '@/lib/billing/prices'
import { initializeTransaction } from '@/lib/billing/paystack'
import { INTENT_TTL_MS, MAX_INTENTS_PER_HOUR, newReference } from '@/lib/billing/intents'

export const dynamic = 'force-dynamic'

// POST /api/checkout { tier }: starts a one-time payment.
// The tier is the ONLY thing taken from the browser. Price, currency, reference, payer e-mail and user all come from the server,
// and the intent row is written before Paystack is called. This is the only way to buy a plan (there is no flag and no fallback).
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tier?: unknown } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const tier = body?.tier
  if (!isTier(tier)) return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })

  // The ₦500 test is for the owner only, and the server decides (hiding the button is not a control).
  if (tier === 'test' && (user.email ?? '').trim().toLowerCase() !== (process.env.PAYSTACK_TEST_EMAIL ?? '').trim().toLowerCase()) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()

  const { data: profile, error: profErr } = await admin.from('users').select('id, email').eq('id', user.id).maybeSingle()
  if (profErr) return NextResponse.json({ error: 'checkout_unavailable' }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })
  const payerEmail = ((profile as { email: string | null }).email || user.email || '').trim()
  if (!payerEmail) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  // Never a silent downgrade: Basic is refused while a Pro plan is running. Renewing the same plan, or buying Pro, is fine.
  if (tier === 'basic') {
    const { data: cur, error: curErr } = await admin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .in('status', ['active', 'cancelled'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (curErr) return NextResponse.json({ error: 'checkout_unavailable' }, { status: 500 })
    if ((cur as { plan?: string } | null)?.plan === 'pro') return NextResponse.json({ error: 'already_has_higher_plan' }, { status: 409 })
  }

  // At most 10 checkouts per user per hour. This query also tells us whether the intents table exists yet.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countErr } = await admin
    .from('payment_intents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', hourAgo)
  if (countErr) {
    console.error('[checkout] payment_intents is not available (migration not run?)')
    return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 })
  }
  if ((count ?? 0) >= MAX_INTENTS_PER_HOUR) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 })

  const reference = newReference()
  const amountKobo = PRICES_KOBO[tier]
  const now = Date.now()
  const { data: intent, error: insErr } = await admin
    .from('payment_intents')
    .insert({
      user_id: user.id,
      tier,
      amount_kobo: amountKobo,
      currency: CURRENCY,
      reference,
      status: 'pending',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + INTENT_TTL_MS).toISOString(),
    })
    .select('id')
    .single()
  if (insErr || !intent) return NextResponse.json({ error: 'checkout_unavailable' }, { status: 500 })
  const intentId = (intent as { id: string }).id

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const init = await initializeTransaction({
    email: payerEmail,
    amountKobo,
    reference,
    callbackUrl: `${appUrl}/checkout/return`,
    metadata: { user_id: user.id, tier, intent: intentId },
  })
  if (!init.ok) {
    await admin.from('payment_intents').update({ status: 'failed' }).eq('id', intentId)
    console.error('[checkout] Paystack initialize failed for an intent (no details logged)')
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }
  await admin.from('payment_intents').update({ access_code: init.accessCode }).eq('id', intentId)

  return NextResponse.json({ authorization_url: init.authorizationUrl, reference })
}
