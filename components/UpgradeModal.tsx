'use client'

import { useEffect, useState } from 'react'
import { useRegion } from '@/hooks/useRegion'
import { useUsdRate } from '@/hooks/useUsdRate'

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
const BASIC_PLAN_CODE = process.env.NEXT_PUBLIC_PAYSTACK_BASIC_PLAN_CODE || ''
const PRO_PLAN_CODE = process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN_CODE || ''
const TEST_PLAN_CODE = 'PLN_gzi13ks4vajcdhx' // ₦500 live test plan — hidden from users

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  portfolioId: string
  onPaymentStarted?: () => void
}

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>
      {text}
    </li>
  )
}

const PriceSkeleton = () => (
  <span style={{ display: 'inline-block', width: 80, height: 20, background: '#e5e7eb', borderRadius: 4, verticalAlign: 'middle' }} />
)

export default function UpgradeModal({ isOpen, onClose, userEmail, portfolioId, onPaymentStarted }: UpgradeModalProps) {
  const { basicUsd, proUsd, rateLoading } = useUsdRate()
  const { region } = useRegion()
  const isIntl = region === 'INTL'

  // Load Paystack inline script
  useEffect(() => {
    if (!isOpen) return
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.head.appendChild(script)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === '1'

  const handlePay = (planCode: string, tier: 'basic' | 'pro') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PaystackPop = (window as any).PaystackPop
    if (!PaystackPop) {
      alert('Payment is loading — please try again in a moment.')
      return
    }

    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      plan: planCode,
      ref: `lp-${portfolioId}-${tier}-${Date.now()}`,
      callback: () => {
        onClose()
        onPaymentStarted?.()
      },
      onClose: () => {},
    })
    handler.openIframe()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32px)', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
          <h2 className="text-xl font-bold text-gray-900">Publish your portfolio</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your portfolio is ready. Choose a plan to go live.
          </p>
        </div>

        {/* Plan cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* BASIC — visually dominant */}
          <div className="relative border-2 border-[#0A66C2] rounded-2xl p-5 flex flex-col bg-[#E8F0F9]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest">
                  Basic
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {isIntl
                    ? (rateLoading || basicUsd === null ? <PriceSkeleton /> : <>${basicUsd}</>)
                    : '₦15,000'}
                  <span className="text-sm font-normal text-gray-400">/year</span>
                </p>
              </div>
              <span className="bg-[#0A66C2] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                Recommended
              </span>
            </div>

            <ul className="space-y-2 mb-5 flex-1">
              <PlanFeature text="Publish your portfolio" />
              <PlanFeature text="Edit anytime" />
              <PlanFeature text="Up to 3 portfolios" />
              <PlanFeature text="Permanent subdomain (yourname.liveportfolio.site)" />
            </ul>

            <button
              onClick={() => handlePay(BASIC_PLAN_CODE, 'basic')}
              className="w-full py-3 bg-[#0A66C2] text-white text-sm font-bold rounded-xl hover:bg-[#084D9A] transition-colors"
            >
              Publish with Basic →
            </button>
          </div>

          {/* PRO — secondary */}
          <div className="border border-gray-200 rounded-2xl p-5 flex flex-col bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Pro
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {isIntl
                    ? (rateLoading || proUsd === null ? <PriceSkeleton /> : <>${proUsd}</>)
                    : '₦45,000'}
                  <span className="text-sm font-normal text-gray-400">/year</span>
                </p>
              </div>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                Power Users
              </span>
            </div>

            <ul className="space-y-2 mb-5 flex-1">
              <PlanFeature text="Everything in Basic" />
              <PlanFeature text="Analytics dashboard (views, country, referrer)" />
              <PlanFeature text="QR code sharing" />
              <PlanFeature text="Weekly career score" />
              <PlanFeature text="Custom domain (connect your own)" />
              <PlanFeature text="Export pack (PDF, LinkedIn summary, cover letter)" />
            </ul>

            <button
              onClick={() => handlePay(PRO_PLAN_CODE, 'pro')}
              className="w-full py-3 border-2 border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400">
            Annual billing · 7-day refund guarantee · Cancel anytime
          </p>
          {isTestMode && (
            <button
              onClick={() => handlePay(TEST_PLAN_CODE, 'basic')}
              className="mt-3 text-xs text-orange-500 underline"
            >
              [TEST] Pay ₦500 to verify payment flow
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
