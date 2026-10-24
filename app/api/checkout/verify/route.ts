import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { grantIntent, Retryable } from '@/lib/billing/grant'
import { findIntent, markIntent } from '@/lib/billing/intents'
import { verifyTransaction } from '@/lib/billing/paystack'

export const dynamic = 'force-dynamic'

// POST /api/checkout/verify { reference }: called by the return page. Asks Paystack what happened to a payment THIS USER started and,
// if it succeeded, grants through the same idempotent function the webhook uses, so a late webhook never delays access.
async function paidResponse(userId: string) {
  const { data } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('plan, expires_at')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const s = data as { plan?: string; expires_at?: string } | null
  return NextResponse.json({ status: 'paid', plan: s?.plan ?? null, expires_at: s?.expires_at ?? null })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reference?: unknown } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : ''
  if (!reference || reference.length > 200) return NextResponse.json({ error: 'invalid_reference' }, { status: 400 })

  try {
    // only this user's own intents are visible: someone else's reference is simply "not found"
    const found = await findIntent(reference, user.id)
    if (found.kind === 'unavailable') return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 })
    if (found.kind === 'none') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const intent = found.intent

    if (intent.status === 'paid') return paidResponse(user.id)

    const v = await verifyTransaction(reference)
    if (!v.ok) return NextResponse.json({ status: 'pending' }) // Paystack unreachable or unreadable: the webhook may still grant

    if (v.status === 'success') {
      if (v.reference !== intent.reference || v.amount !== intent.amount_kobo || v.currency !== intent.currency) {
        console.warn(`[checkout] verify mismatch reference=${intent.reference} expected_amount=${intent.amount_kobo} got_amount=${v.amount} got_currency=${v.currency}`)
        return NextResponse.json({ error: 'verification_mismatch' }, { status: 409 })
      }
      const r = await grantIntent(getSupabaseAdmin(), intent)
      if (r === 'no_user') return NextResponse.json({ error: 'grant_failed' }, { status: 500 })
      return paidResponse(user.id)
    }

    if (v.status === 'abandoned') {
      await markIntent(intent.id, { status: 'failed' })
      return NextResponse.json({ status: 'abandoned' })
    }
    if (v.status === 'failed' || v.status === 'reversed') {
      await markIntent(intent.id, { status: 'failed' })
      return NextResponse.json({ status: 'failed' })
    }
    return NextResponse.json({ status: 'pending' }) // ongoing, pending, processing, queued
  } catch (err) {
    console.error('[checkout] verify error', err instanceof Retryable ? err.message : 'unexpected')
    return NextResponse.json({ error: 'grant_failed' }, { status: 500 })
  }
}
