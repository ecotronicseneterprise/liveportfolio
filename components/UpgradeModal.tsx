'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { isProTemplate, newFeatures } from '@/lib/plans'
import { BILLING_COPY } from '@/lib/billing/copy'
import { SUPPORT_EMAIL } from '@/lib/brand'
import PriceTag from '@/components/PriceTag'
import { t } from '@/lib/onboarding/t'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  portfolioId: string
  /** The template the portfolio currently uses; a Pro template gets an explanatory note at checkout. */
  template?: string
  /** A Basic owner upgrading: only the Pro plan is offered. */
  proOnly?: boolean
  onPaymentStarted?: () => void
}

type Tier = 'basic' | 'pro' | 'test'

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>
      {text}
    </li>
  )
}

/**
 * Choose a plan, then pay on Paystack. The browser sends ONLY the tier name to /api/checkout; the server picks the price and the reference
 * and returns a Paystack page that offers every payment channel enabled on the account. There is no other payment path: if checkout cannot
 * start, the person sees a clear message with the support address.
 */
export default function UpgradeModal({ isOpen, onClose, template, proOnly = false }: UpgradeModalProps) {
  const [busy, setBusy] = useState<Tier | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // begin_checkout when the modal opens (only fires if the person accepted analytics)
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'begin_checkout', { currency: 'NGN', value: 15000, items: [{ item_name: 'basic', item_category: 'plan' }] })
    }
  }, [isOpen])

  if (!isOpen) return null

  const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === '1'
  const trouble = `Payment could not be started. Please try again in a moment, or e-mail ${SUPPORT_EMAIL} and we will help.`

  const startCheckout = async (tier: Tier) => {
    if (busy) return
    setBusy(tier)
    setError(null)
    try {
      const { data } = await getSupabaseClient().auth.getSession()
      if (!data.session) {
        setError('Please sign in again, then choose your plan.')
        return
      }
      if (typeof window.gtag !== 'undefined') window.gtag('event', 'payment_modal_open', { plan: tier, currency: 'NGN' })
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ tier }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && typeof j.authorization_url === 'string' && j.authorization_url.startsWith('https://checkout.paystack.com/')) {
        try { localStorage.setItem('lp_checkout_ref', String(j.reference || '')) } catch { /* storage blocked */ }
        window.location.href = j.authorization_url
        return // leave "busy" on: the page is navigating away
      }
      setError(
        j.error === 'already_has_higher_plan' ? 'You already have a Pro plan.'
        : j.error === 'too_many_attempts' ? 'Too many attempts. Please try again in an hour.'
        : j.error === 'forbidden' ? 'That test payment is only for the account owner.'
        : trouble,
      )
    } catch {
      setError(trouble)
    }
    setBusy(null)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl" style={{ maxHeight: 'min(600px, calc(100vh - 48px))', overflowY: 'auto' } as React.CSSProperties}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl leading-none w-11 h-11 flex items-center justify-center"
          >
            ×
          </button>
          <h2 id="upgrade-title" className="text-xl font-bold text-gray-900">{proOnly ? t('billing.upgradeTitle') : 'Publish your portfolio'}</h2>
          <p className="text-sm text-gray-600 mt-1">{proOnly ? t('billing.upgradeLead') : 'Your portfolio is ready. Choose a plan to go live.'}</p>
          {template && isProTemplate(template) && (
            <p className="text-sm text-gray-700 mt-2" role="note">
              Your portfolio uses a Pro template. Basic publishes it with Minimal; Pro publishes it as you see it now.
            </p>
          )}
        </div>

        {/* Plan cards */}
        <div className={`p-4 grid grid-cols-1 ${proOnly ? '' : 'sm:grid-cols-2'} gap-3`}>

          {/* BASIC: visually dominant (hidden when a Basic owner is upgrading) */}
          {!proOnly && (
          <div className="relative border-2 border-[#0A66C2] rounded-2xl p-3 flex flex-col bg-[#E8F0F9]">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div>
                <span className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest">Basic</span>
                <PriceTag plan="basic" variant="modal" />
              </div>
              <span className="bg-[#0A66C2] text-white text-xs font-bold px-2.5 py-1 rounded-full">Recommended</span>
            </div>

            <ul className="space-y-1.5 flex-1">
              <PlanFeature text="Everything in Free" />
              {newFeatures('basic').map((f) => <PlanFeature key={f.id} text={f.label} />)}
            </ul>

            <button
              onClick={() => startCheckout('basic')}
              disabled={busy !== null}
              className="w-full min-h-[44px] mt-3 bg-[#0A66C2] text-white text-sm font-bold rounded-xl hover:bg-[#084D9A] transition-colors disabled:opacity-60"
            >
              {busy === 'basic' ? 'Opening Paystack…' : 'Publish with Basic →'}
            </button>
          </div>
          )}

          {/* PRO: secondary */}
          <div className="border border-gray-200 rounded-2xl p-3 flex flex-col bg-white">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Pro</span>
                <PriceTag plan="pro" variant="modal" />
              </div>
              <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">Power Users</span>
            </div>

            <ul className="space-y-1.5 flex-1">
              <PlanFeature text="Everything in Basic" />
              {newFeatures('pro').map((f) => <PlanFeature key={f.id} text={f.label} />)}
            </ul>

            <button
              onClick={() => startCheckout('pro')}
              disabled={busy !== null}
              className="w-full min-h-[44px] mt-3 border-2 border-gray-300 text-gray-800 text-sm font-bold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {busy === 'pro' ? 'Opening Paystack…' : 'Upgrade to Pro →'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mx-4 mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-600">{BILLING_COPY.modalFooter}</p>
          <p className="text-xs text-gray-600 mt-1">Paystack shows the payment options available to you.</p>
          {isTestMode && (
            <button
              onClick={() => startCheckout('test')}
              disabled={busy !== null}
              className="mt-3 min-h-[44px] text-xs text-orange-700 underline disabled:opacity-60"
            >
              [TEST] Pay ₦500 to verify payment flow (account owner only)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
