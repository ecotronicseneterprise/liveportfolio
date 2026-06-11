'use client'

import Link from 'next/link'
import { useRegion } from '@/hooks/useRegion'
import { useUsdRate } from '@/hooks/useUsdRate'

const PriceSkeleton = () => (
  <span style={{ display: 'inline-block', width: 80, height: 20, background: '#e5e7eb', borderRadius: 4, verticalAlign: 'middle' }} />
)

export default function PricingSection() {
  const { region } = useRegion()
  const { basicUsd, proUsd, rateLoading } = useUsdRate()
  const isIntl = region === 'INTL'

  return (
    <section className="w-full bg-gray-50 border-b border-gray-100">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <p className="text-xs font-bold text-[#0A66C2] tracking-widest uppercase mb-4">Pricing</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-3 leading-tight">Simple, honest pricing.</h2>
        <p className="text-gray-500 text-lg leading-relaxed mb-10">
          Build and preview free. Subscribe to publish, track, and grow.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">

          {/* FREE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Free</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₦0</p>
            <p className="text-sm text-gray-400 mb-5">Always free</p>
            <ul className="space-y-2 text-sm text-gray-500 mb-6 flex-1">
              {['Generate your portfolio', 'Preview all three templates', 'Saved to your account'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-gray-300 flex-shrink-0">✓</span>{f}
                </li>
              ))}
              {['Publishing', 'Editing', 'Analytics'].map((f) => (
                <li key={f} className="flex items-center gap-2 opacity-40">
                  <span className="flex-shrink-0">—</span>{f} not included
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className="w-full text-center py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* BASIC — dominant */}
          <div className="relative bg-white border-2 border-[#0A66C2] rounded-2xl p-6 flex flex-col shadow-lg shadow-[#0A66C2]/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#0A66C2] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Recommended
              </span>
            </div>
            <p className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest mb-2 mt-2">Basic</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {isIntl
                ? (rateLoading || basicUsd === null ? <PriceSkeleton /> : <>${basicUsd}</>)
                : '₦15,000'}
              <span className="text-base font-normal text-gray-400">/year</span>
            </p>
            <p className="text-sm text-gray-400 mb-0.5">The core product</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6 flex-1">
              {[
                'Publish your portfolio',
                'Edit anytime',
                'Up to 3 portfolios',
                'Permanent subdomain (yourname.liveportfolio.site)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className="w-full text-center py-3 bg-[#0A66C2] text-white rounded-xl text-sm font-bold hover:bg-[#084D9A] transition-colors"
            >
              Get started →
            </Link>
          </div>

          {/* PRO — secondary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Pro
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {isIntl
                ? (rateLoading || proUsd === null ? <PriceSkeleton /> : <>${proUsd}</>)
                : '₦45,000'}
              <span className="text-base font-normal text-gray-400">/year</span>
            </p>
            <p className="text-sm text-gray-400 mb-0.5">Power users</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-6 flex-1">
              {[
                'Everything in Basic',
                'Analytics dashboard (views, company, country, referrer)',
                'QR code sharing',
                'Weekly AI career score',
                'Custom domain (connect your own)',
                'Export pack (PDF, LinkedIn summary, cover letter)',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className="w-full text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors"
            >
              Go Pro →
            </Link>
          </div>

        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Annual billing · 7-day refund guarantee · Cancel anytime</p>
      </div>
    </section>
  )
}
