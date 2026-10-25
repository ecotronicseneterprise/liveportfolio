'use client'

import { CREATE_HREF } from '@/lib/onboarding/entry'
import { BILLING_COPY } from '@/lib/billing/copy'
import PriceTag from '@/components/PriceTag'
import Link from 'next/link'
import { comingSoon, includedFeatures, newFeatures, FEATURES } from '@/lib/plans'

// Every feature line below comes from lib/plans.ts (the single source of truth); nothing is typed here.
const notInFree = ['publish', 'pro_templates', 'analytics'].map((id) => FEATURES.find((f) => f.id === id)!.label)

export default function PricingSection() {
  return (
    <section className="w-full bg-gray-50 border-b border-gray-100">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-3 leading-tight">Simple, honest pricing.</h2>
        <p className="text-gray-500 text-lg leading-relaxed mb-10">
          Build and preview free. Pay once for 12 months to publish, track, and grow.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">

          {/* FREE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Free</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₦0</p>
            <p className="text-sm text-gray-600 mb-5">Always free</p>
            <ul className="space-y-2 text-sm text-gray-500 mb-6 flex-1">
              {includedFeatures('free').map((x) => x.label).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-gray-300 flex-shrink-0">✓</span>{f}
                </li>
              ))}
              {notInFree.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="flex-shrink-0">—</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href={CREATE_HREF}
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
            <PriceTag plan="basic" variant="section" />
            <p className="text-sm text-gray-600 mb-0.5">For job seekers</p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
              {['Everything in Free', ...newFeatures('basic').map((x) => x.label)].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href={CREATE_HREF}
              className="w-full text-center py-3 bg-[#0A66C2] text-white rounded-xl text-sm font-bold hover:bg-[#084D9A] transition-colors"
            >
              Get started →
            </Link>
          </div>

          {/* PRO — secondary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
              Pro
            </p>
            <PriceTag plan="pro" variant="section" />
            <p className="text-sm text-gray-600 mb-0.5">For serious applicants</p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6 flex-1">
              {['Everything in Basic', ...newFeatures('pro').map((x) => x.label)].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-[#0A66C2] font-bold flex-shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <Link
              href={CREATE_HREF}
              className="w-full text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors"
            >
              Go Pro →
            </Link>
          </div>

        </div>
        {comingSoon().length > 0 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Coming soon, not included yet: {comingSoon().map((x) => x.label).join(', ')}.
          </p>
        )}
        <p className="text-center text-sm text-gray-600 mt-6">{BILLING_COPY.pricingNote}</p>
      </div>
    </section>
  )
}
