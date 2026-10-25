// Self-serve refund: within 7 days of paying, the owner of a payment can cancel and get the full amount back. Server only.
// Everything is decided here: whose payment, how old (payments.created_at, written by the server at grant time; the client's clock
// is never used), whether it was already refunded, and the amount (always the full original amount: Paystack is asked to refund the
// transaction without an amount). The claim is an atomic conditional update on payment_intents (status 'paid' -> 'refunded'), so a
// double click or two tabs produce one Paystack call. If Paystack refuses, the claim is released, the owner is told by e-mail, and
// the person is told the request is pending. Access is revoked only after Paystack accepted the refund; `payments.refunded_at` is
// set last, so if revoking fails the webhook's refund.processed (which only skips payments already marked) still revokes.
import { SUPPORT_EMAIL } from '@/lib/brand'
import type { Admin } from './grant'
import { DAY_MS } from './upgrade'

export const REFUND_WINDOW_MS = 7 * DAY_MS

export type RefundOutcome =
  | 'requested' // the owner has been e-mailed; the refund is made by hand in Paystack
  | 'refunded' // Paystack accepted; access ended
  | 'pending_manual' // Paystack refused or was unreachable; the owner has been told
  | 'no_payment'
  | 'already_refunded'
  | 'window_closed'
  | 'not_refundable' // not a payment made through the one-time checkout (e.g. a manual grant): ask support
  | 'unavailable'

export type PaystackRefund = (reference: string) => Promise<{ ok: boolean }>

const TIMEOUT_MS = 8000

/** POST /refund with the transaction reference only. Never logs the key; resolves { ok:false } on any failure. */
export const paystackRefund: PaystackRefund = async (reference) => {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) return { ok: false }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: reference }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const body = (await res.json().catch(() => null)) as { status?: unknown } | null
    return { ok: (res.status === 200 || res.status === 201) && body?.status === true }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}

type PaymentRow = { id: string; ls_order_id: string; product_tier: string; amount_cents: number; created_at: string; refunded_at: string | null }

export interface RefundDeps {
  refund?: PaystackRefund
  notifyOwner?: (subject: string, html: string) => Promise<void>
  now?: () => number
}

const defaultNotify = async (subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) return
  try {
    const { sendEmail } = await import('@/lib/email') // loaded on demand: the e-mail client needs its key at import time
    await sendEmail({ to: SUPPORT_EMAIL, subject, html })
  } catch { /* never fail the request because of e-mail */ }
}

/** What a refund would cover right now (for the panel). Pure read; the same rules as requestRefund. */
export async function refundableNow(admin: Admin, userId: string, now: number = Date.now()): Promise<{ eligible: boolean; deadline: string | null; reference_kind: 'one_time' | 'other' | null; tier: string | null; amount_kobo: number | null; paid_at: string | null }> {
  const p = await latestPayment(admin, userId)
  if (!p) return { eligible: false, deadline: null, reference_kind: null, tier: null, amount_kobo: null, paid_at: null }
  const paid = new Date(p.created_at).getTime()
  const deadline = new Date(paid + REFUND_WINDOW_MS).toISOString()
  const oneTime = p.ls_order_id.startsWith('lpi_')
  return {
    eligible: !p.refunded_at && oneTime && now - paid <= REFUND_WINDOW_MS,
    deadline,
    reference_kind: oneTime ? 'one_time' : 'other',
    tier: p.product_tier,
    amount_kobo: p.amount_cents,
    paid_at: p.created_at,
  }
}

async function latestPayment(admin: Admin, userId: string): Promise<PaymentRow | null> {
  const { data, error } = await admin
    .from('payments')
    .select('id, ls_order_id, product_tier, amount_cents, created_at, refunded_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('payment lookup failed')
  return (data as PaymentRow | null) ?? null
}

export async function requestRefund(admin: Admin, userId: string, deps: RefundDeps = {}): Promise<{ outcome: RefundOutcome }> {
  const refund = deps.refund ?? paystackRefund
  const notifyOwner = deps.notifyOwner ?? defaultNotify
  const now = (deps.now ?? Date.now)()

  let pay: PaymentRow | null
  try { pay = await latestPayment(admin, userId) } catch { return { outcome: 'unavailable' } }
  if (!pay) return { outcome: 'no_payment' }
  if (pay.refunded_at) return { outcome: 'already_refunded' }
  const paid = new Date(pay.created_at).getTime()
  if (!Number.isFinite(paid)) return { outcome: 'unavailable' }
  if (now - paid > REFUND_WINDOW_MS) return { outcome: 'window_closed' }
  if (!pay.ls_order_id.startsWith('lpi_')) return { outcome: 'not_refundable' }

  // atomic claim: only one caller moves the intent from 'paid' to 'refunded'
  const claim = await admin
    .from('payment_intents')
    .update({ status: 'refunded' })
    .eq('reference', pay.ls_order_id)
    .eq('user_id', userId)
    .eq('status', 'paid')
    .select('id')
  if (claim.error) {
    console.error('[refund] claim failed (intents table missing?)')
    return { outcome: 'unavailable' }
  }
  if (!claim.data || (claim.data as unknown[]).length === 0) {
    const { data: existing } = await admin.from('payment_intents').select('status').eq('reference', pay.ls_order_id).eq('user_id', userId).maybeSingle()
    return { outcome: (existing as { status?: string } | null)?.status === 'refunded' ? 'already_refunded' : 'unavailable' }
  }

  const result = await refund(pay.ls_order_id)
  if (!result.ok) {
    // release the claim so the request can be handled by hand or tried again, and tell the owner (reference only, no personal data)
    await admin.from('payment_intents').update({ status: 'paid' }).eq('reference', pay.ls_order_id).eq('user_id', userId).eq('status', 'refunded')
    console.error('[refund] Paystack did not accept the refund; the owner was notified. reference', pay.ls_order_id)
    await notifyOwner(
      'Refund request needs a manual refund',
      `<p>A customer asked to cancel within 7 days and Paystack did not accept the automatic refund (the payment channel may not support it).</p><p>Reference: ${pay.ls_order_id}<br/>Tier: ${pay.product_tier}<br/>Amount (kobo): ${pay.amount_cents}</p><p>Refund it in the Paystack dashboard; the refund.processed webhook then ends the plan.</p>`,
    )
    return { outcome: 'pending_manual' }
  }

  try {
    const { revokeEntitlement } = await import('./grant') // on demand: grant.ts pulls in the e-mail client
    await revokeEntitlement(admin, userId)
    await admin.from('payments').update({ refunded_at: new Date(now).toISOString() }).eq('id', pay.id)
  } catch {
    // The refund went through but ending access failed. refunded_at is still empty, so the refund.processed webhook will finish it.
    console.error('[refund] RECONCILE BY HAND: refund accepted but access was not ended. reference', pay.ls_order_id)
  }
  console.log('[refund] refunded. reference', pay.ls_order_id)
  return { outcome: 'refunded' }
}

/**
 * The gate in front of the refund. A person cannot hop in and out of a paid plan on their own: asking for a refund checks the same
 * rules as above (own latest one-time payment, within 7 days, not already refunded) and then e-mails the owner at SUPPORT_EMAIL with
 * the details. Nothing is changed here. The owner issues the refund in the Paystack dashboard, and the existing refund.processed
 * webhook then ends the plan and unpublishes the portfolio. requestRefund (the one-click Paystack refund) is kept, unused, for later.
 */
export async function submitRefundRequest(admin: Admin, userId: string, deps: { notifyOwner?: RefundDeps['notifyOwner']; now?: () => number } = {}): Promise<{ outcome: RefundOutcome }> {
  const notifyOwner = deps.notifyOwner ?? defaultNotify
  const now = (deps.now ?? Date.now)()
  let pay: PaymentRow | null
  try { pay = await latestPayment(admin, userId) } catch { return { outcome: 'unavailable' } }
  if (!pay) return { outcome: 'no_payment' }
  if (pay.refunded_at) return { outcome: 'already_refunded' }
  const paid = new Date(pay.created_at).getTime()
  if (!Number.isFinite(paid)) return { outcome: 'unavailable' }
  if (now - paid > REFUND_WINDOW_MS) return { outcome: 'window_closed' }

  let email = ''
  try {
    const { data } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
    email = (data as { email?: string } | null)?.email ?? ''
  } catch { /* the reference below is enough to find the payment */ }

  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
  await notifyOwner(
    'Refund request: please review',
    `<p>A customer asked for a refund inside the 7-day window.</p><p>Account: ${esc(email) || '(unknown)'}<br/>Payment reference: ${esc(pay.ls_order_id)}<br/>Plan: ${esc(pay.product_tier)}<br/>Amount (kobo): ${pay.amount_cents}<br/>Paid: ${esc(pay.created_at)}</p><p>To approve, refund the transaction in the Paystack dashboard. The refund.processed webhook then ends the plan and unpublishes the portfolio. To decline, reply to the customer. Their plan stays active until you refund.</p>`,
  )
  console.log('[refund] request sent to the owner. reference', pay.ls_order_id)
  return { outcome: 'requested' }
}
