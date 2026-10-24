'use client'

import { useEffect, useState } from 'react'
import { formatNaira } from '@/lib/billing/copy'
import { SUPPORT_EMAIL } from '@/lib/brand'

export interface Billing {
  plan: 'free' | 'basic' | 'pro'
  expires_at: string | null
  days_left: number | null
  one_time: boolean | null
  payments: Array<{ date: string; plan: string; amount_kobo: number; refunded: boolean }>
}

const NAME = { free: 'Free', basic: 'Basic', pro: 'Pro' } as const
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** What you are on, when it ends, what you paid, and how to get a refund. Read-only; paying goes through the upgrade modal. */
export default function PlanBillingPanel({ token, onPay }: { token: string; onPay: () => void }) {
  const [b, setB] = useState<Billing | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let live = true
    fetch('/api/billing', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('billing'))))
      .then((j) => { if (live) setB(j as Billing) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [token])

  const card = 'bg-white border border-gray-100 rounded-2xl p-6'
  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'

  if (failed) {
    return (
      <section className={card} aria-labelledby="plan-h">
        <h2 id="plan-h" className="text-base font-semibold text-gray-900 mb-2">Plan and billing</h2>
        <p className="text-sm text-gray-700">We could not load your billing details. Reload the page, or e-mail {SUPPORT_EMAIL}.</p>
      </section>
    )
  }
  if (!b) return null
  return <PlanBillingView b={b} onPay={onPay} />
}

/** The panel itself (separate from the fetching so it can be rendered and tested on its own). */
export function PlanBillingView({ b, onPay }: { b: Billing; onPay: () => void }) {
  const card = 'bg-white border border-gray-100 rounded-2xl p-6'
  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0A66C2] px-5 text-sm font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'
  const paid = b.plan !== 'free'
  const ending = paid && b.days_left !== null && b.days_left <= 60

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
          <div className="mt-4"><button type="button" className={btn} onClick={onPay}>{b.one_time === false ? 'Manage or upgrade' : 'Renew for 12 months'}</button></div>
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

      <p className="mt-4 text-sm text-gray-600">
        7-day refund guarantee. To ask for a refund, e-mail{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#0A66C2] underline">{SUPPORT_EMAIL}</a> within 7 days of paying.
      </p>
    </section>
  )
}
