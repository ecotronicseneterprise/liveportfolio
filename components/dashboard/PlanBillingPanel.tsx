'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatNaira } from '@/lib/billing/copy'
import { SUPPORT_EMAIL } from '@/lib/brand'
import { t } from '@/lib/onboarding/t'

export interface Billing {
  plan: 'free' | 'basic' | 'pro'
  expires_at: string | null
  days_left: number | null
  one_time: boolean | null
  payments: Array<{ date: string; plan: string; amount_kobo: number; refunded: boolean }>
  /** What a refund would cover right now, decided by the server (absent on older responses). */
  refund?: { eligible: boolean; deadline: string | null; tier: string | null; amount_kobo: number | null; one_time: boolean } | null
}

const NAME = { free: 'Free', basic: 'Basic', pro: 'Pro' } as const
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export type RefundResult = 'requested' | 'error'

/** What you are on, when it ends, what you paid, and how to cancel, upgrade or renew. Paying goes through the checkout. */
export default function PlanBillingPanel({ token, onPay }: { token: string; onPay: () => void }) {
  const [b, setB] = useState<Billing | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    if (!token) return () => {}
    let live = true
    fetch('/api/billing', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('billing'))))
      .then((j) => { if (live) setB(j as Billing) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [token])
  useEffect(() => load(), [load])

  const onRefund = async (): Promise<RefundResult> => {
    try {
      const res = await fetch('/api/billing/refund', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const j = await res.json().catch(() => ({}))
      if (j.outcome === 'requested') return 'requested'
      load() // the window may have closed or a refund may already be done: show the truth
      return 'error'
    } catch { return 'error' }
  }

  if (failed) {
    return (
      <section className="bg-white border border-gray-100 rounded-2xl p-6" aria-labelledby="plan-h">
        <h2 id="plan-h" className="text-base font-semibold text-gray-900 mb-2">Plan and billing</h2>
        <p className="text-sm text-gray-700">We could not load your billing details. Reload the page, or e-mail {SUPPORT_EMAIL}.</p>
      </section>
    )
  }
  if (!b) return null
  return <PlanBillingView b={b} onPay={onPay} onRefund={onRefund} />
}

/** The panel itself (separate from the fetching so it can be rendered and tested on its own). */
export function PlanBillingView({ b, onPay, onRefund }: {
  b: Billing
  onPay: () => void
  onRefund?: () => Promise<RefundResult>
}) {
  const card = 'bg-white border border-gray-100 rounded-2xl p-6'
  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 disabled:opacity-60'
  const btnQuiet = 'inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 disabled:opacity-60'
  const paid = b.plan !== 'free'
  const ending = paid && b.days_left !== null && b.days_left <= 60

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const canCancel = !!(b.refund?.eligible && b.refund.deadline && onRefund)
  const lastPaid = b.refund && b.refund.amount_kobo !== null ? formatNaira(b.refund.amount_kobo / 100) : ''
  const lastPlan = b.refund?.tier === 'pro' ? t('billing.planPro') : t('billing.planBasic')
  const lastDate = b.payments[0] ? date(b.payments[0].date) : ''

  const doRefund = async () => {
    if (!onRefund || busy) return
    setBusy(true)
    const r = await onRefund()
    setBusy(false)
    setConfirming(false)
    setNote(r === 'requested' ? t('billing.refundDone') : t('billing.refundFailed', { email: SUPPORT_EMAIL }))
  }
  return (
    <section className={card} aria-labelledby="plan-h">
      <h2 id="plan-h" className="text-base font-semibold text-gray-900 mb-1">Plan and billing</h2>

      {!paid ? (
        <>
          <p className="text-sm text-gray-700">You are on the <strong>Free</strong> plan. Your portfolio is private: only you can see it.</p>
          <div className="mt-4"><button type="button" className={btn} onClick={onPay}>Publish my portfolio</button></div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            <strong>{NAME[b.plan]}</strong> plan{b.expires_at ? <>, active until <strong>{date(b.expires_at)}</strong></> : null}
            {b.days_left !== null ? <span className={ending ? 'text-amber-800 font-medium' : 'text-gray-600'}> ({b.days_left} {b.days_left === 1 ? 'day' : 'days'} left)</span> : null}
          </p>
          {b.one_time === true && (
            <p className="mt-1 text-sm text-gray-600">This plan does not renew automatically. Renewing adds 12 months to the time you have left.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={btn} onClick={onPay}>{b.one_time === false ? 'Manage or upgrade' : 'Renew for 12 months'}</button>
            {b.plan === 'basic' && (
              <button type="button" className={btnQuiet} onClick={onPay}>{t('billing.upgradeButton')}</button>
            )}
          </div>
          {b.plan === 'basic' && <p className="mt-2 text-sm text-gray-600">{t('billing.upgradeNote', { email: SUPPORT_EMAIL })}</p>}
        </>
      )}

      {b.payments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Payments</h3>
          <ul className="divide-y divide-gray-100 border-t border-b border-gray-100">
            {b.payments.map((p, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-700">{date(p.date)} · {p.plan === 'pro' ? 'Pro' : 'Basic'}</span>
                <span className="text-gray-900">{formatNaira(p.amount_kobo / 100)} <span className={p.refunded ? 'text-gray-600' : 'text-green-800'}>{p.refunded ? 'Refunded' : 'Paid'}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {note && <p role="status" className="mt-4 text-sm text-gray-900 border-l-4 border-[#0A66C2] pl-3">{note}</p>}

      {paid && canCancel && !confirming && !note && (
        <div className="mt-4">
          <p className="text-sm text-gray-700">{t('billing.refundDeadline', { date: date(b.refund!.deadline!) })} {t('billing.refundOnlyLatest')}</p>
          <button type="button" className={`${btnQuiet} mt-3`} onClick={() => setConfirming(true)}>{t('billing.cancelButton')}</button>
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-labelledby="cancel-h" aria-describedby="cancel-d" className="mt-4 border border-gray-300 rounded-xl p-4">
          <h3 id="cancel-h" className="text-sm font-semibold text-gray-900">{t('billing.cancelTitle')}</h3>
          <p id="cancel-d" className="mt-1 text-sm text-gray-700">
            {t('billing.cancelCovers', { plan: lastPlan, amount: lastPaid, date: lastDate })} {t('billing.cancelBody', { amount: lastPaid })}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={btn} onClick={doRefund} disabled={busy}>{busy ? t('billing.cancelWorking') : t('billing.cancelConfirm')}</button>
            <button type="button" className={btnQuiet} onClick={() => setConfirming(false)} disabled={busy}>{t('billing.cancelKeep')}</button>
          </div>
        </div>
      )}

      {paid && !canCancel && b.refund && b.refund.one_time && b.expires_at && !note && (
        <p className="mt-4 text-sm text-gray-600">{t('billing.refundClosed', { date: date(b.expires_at) })}</p>
      )}

      {(!paid || !b.refund) && !note && (
        <p className="mt-4 text-sm text-gray-600">
          7-day refund guarantee. To ask for a refund, e-mail{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#0A66C2] underline">{SUPPORT_EMAIL}</a> within 7 days of paying.
        </p>
      )}
    </section>
  )
}
