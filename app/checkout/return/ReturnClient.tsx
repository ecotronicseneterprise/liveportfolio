'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { SIGNIN_HREF } from '@/lib/onboarding/entry'

type View =
  | { kind: 'checking' }
  | { kind: 'paid'; plan: string | null; expiresAt: string | null }
  | { kind: 'not_completed' }
  | { kind: 'waiting' }
  | { kind: 'signin' }
  | { kind: 'missing' }

const POLL_MS = 3000
const MAX_TRIES = 20 // about a minute

const planName = (p: string | null) => (p === 'pro' ? 'Pro' : p === 'basic' ? 'Basic' : 'Your plan')

/**
 * Paystack sends the person back here after paying (callback_url). We ask the server to verify the payment with Paystack and grant
 * through the same function the webhook uses, so access does not depend on the webhook arriving first. Polls for about a minute.
 */
export default function ReturnClient() {
  const [view, setView] = useState<View>({ kind: 'checking' })
  const [reference, setReference] = useState('')
  const [tick, setTick] = useState(0)
  const tries = useRef(0)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    let ref = q.get('reference') || q.get('trxref') || ''
    if (!ref) {
      try { ref = localStorage.getItem('lp_checkout_ref') || '' } catch { /* storage blocked */ }
    }
    setReference(ref.slice(0, 200))
  }, [])

  useEffect(() => {
    if (!reference) {
      const t = setTimeout(() => setView((v) => (v.kind === 'checking' ? { kind: 'missing' } : v)), 600)
      return () => clearTimeout(t)
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    tries.current = 0
    setView({ kind: 'checking' })

    const run = async () => {
      if (cancelled) return
      tries.current += 1
      try {
        const { data } = await getSupabaseClient().auth.getSession()
        if (!data.session) { if (!cancelled) setView({ kind: 'signin' }); return }
        const res = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ reference }),
        })
        const j = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 404) { setView({ kind: 'missing' }); return }
        if (res.ok && j.status === 'paid') {
          try { localStorage.removeItem('lp_checkout_ref') } catch { /* storage blocked */ }
          setView({ kind: 'paid', plan: j.plan ?? null, expiresAt: j.expires_at ?? null })
          return
        }
        if (res.ok && (j.status === 'abandoned' || j.status === 'failed')) { setView({ kind: 'not_completed' }); return }
      } catch {
        // network trouble: keep trying until the limit
      }
      if (cancelled) return
      if (tries.current >= MAX_TRIES) { setView({ kind: 'waiting' }); return }
      timer = setTimeout(run, POLL_MS)
    }
    run()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [reference, tick])

  const card = 'mx-auto max-w-md px-5 py-16 text-center'
  const btn = 'inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0A66C2] px-6 text-sm font-semibold text-white hover:bg-[#084D9A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'
  const btn2 = 'inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-900 bg-white px-6 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2'

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <div className={card}>
        <p role="status" aria-live="polite" className="sr-only">
          {view.kind === 'checking' ? 'Confirming your payment' : view.kind === 'paid' ? 'Payment confirmed' : ''}
        </p>

        {view.kind === 'checking' && (
          <>
            <h1 className="text-2xl font-bold">Confirming your payment…</h1>
            <p className="mt-3 text-gray-700">This usually takes a few seconds. Please keep this page open.</p>
          </>
        )}

        {view.kind === 'paid' && (
          <>
            <h1 className="text-2xl font-bold">Payment received</h1>
            <p className="mt-3 text-gray-700">
              {planName(view.plan)} is active
              {view.expiresAt ? ` until ${new Date(view.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
              Your portfolio is live. We have emailed you the link.
            </p>
            <div className="mt-8"><Link href="/dashboard" className={btn}>Go to my dashboard</Link></div>
          </>
        )}

        {view.kind === 'not_completed' && (
          <>
            <h1 className="text-2xl font-bold">The payment was not completed</h1>
            <p className="mt-3 text-gray-700">
              Nothing has been taken for this attempt. You can try again from your dashboard, and you can choose card, bank transfer or USSD
              if they are offered.
            </p>
            {reference && <p className="mt-3 break-all text-sm text-gray-600">Reference: {reference}</p>}
            <div className="mt-8"><Link href="/dashboard" className={btn}>Back to my dashboard</Link></div>
          </>
        )}

        {view.kind === 'waiting' && (
          <>
            <h1 className="text-2xl font-bold">We are still waiting for confirmation</h1>
            <p className="mt-3 text-gray-700">
              If you completed the payment, your plan is activated as soon as Paystack confirms it, usually within a few minutes. You do not need to pay again.
              If nothing changes, email{' '}
              <a href="mailto:support@liveportfolio.site" className="font-medium text-[#0A66C2] underline">support@liveportfolio.site</a> with this reference.
            </p>
            {reference && <p className="mt-3 break-all text-sm text-gray-600">Reference: {reference}</p>}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" className={btn} onClick={() => setTick((n) => n + 1)}>Check again</button>
              <Link href="/dashboard" className={btn2}>Go to my dashboard</Link>
            </div>
          </>
        )}

        {view.kind === 'signin' && (
          <>
            <h1 className="text-2xl font-bold">Sign in to confirm your payment</h1>
            <p className="mt-3 text-gray-700">Sign in with the account you paid from. We will confirm the payment as soon as you are back on this page.</p>
            <div className="mt-8"><Link href={SIGNIN_HREF} className={btn}>Sign in</Link></div>
          </>
        )}

        {view.kind === 'missing' && (
          <>
            <h1 className="text-2xl font-bold">We could not find that payment</h1>
            <p className="mt-3 text-gray-700">
              If you paid just now, open the dashboard and check your plan. If you were charged and nothing changed, email{' '}
              <a href="mailto:support@liveportfolio.site" className="font-medium text-[#0A66C2] underline">support@liveportfolio.site</a>
              {reference ? ' with the reference below.' : ' with the date and amount.'}
            </p>
            {reference && <p className="mt-3 break-all text-sm text-gray-600">Reference: {reference}</p>}
            <div className="mt-8"><Link href="/dashboard" className={btn}>Go to my dashboard</Link></div>
          </>
        )}
      </div>
    </div>
  )
}
