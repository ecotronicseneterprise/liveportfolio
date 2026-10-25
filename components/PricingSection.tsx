'use client'

import { CREATE_HREF } from '@/lib/onboarding/entry'
import { BILLING_COPY } from '@/lib/billing/copy'
import PriceTag from '@/components/PriceTag'
import Link from 'next/link'
import { comingSoon, includedFeatures } from '@/lib/plans'

// Every feature line below comes from lib/plans.ts (the single source of truth); nothing is typed here. Each card lists the plan's
// FULL set of available features, so the lists grow Free < Basic < Pro and nothing the product does today is left out. Features that
// are not built yet appear only under the "Coming soon" heading in the Pro card, never as included.
const card = 'relative bg-white border-2 rounded-2xl p-6 flex flex-col h-full'
const list = 'space-y-2.5 text-sm text-gray-700 mb-6 flex-1'
const cta = 'w-full text-center py-3 rounded-xl text-sm font-bold transition-colors'

function Features({ plan, tick }: { plan: 'free' | 'basic' | 'pro'; tick: string }) {
  return (
    <>
      {includedFeatures(plan).map((x) => (
        <li key={x.id} className="flex items-start gap-2">
          <span className={`${tick} flex-shrink-0 font-bold leading-5`} aria-hidden="true">✓</span>
          <span>{x.label}</span>
        </li>
      ))}
    </>
  )
}

export default function PricingSection() {
  const soon = comingSoon()
  return (
    <section className="w-full bg-gray-50 border-b border-gray-100">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-3 leading-tight">Simple, honest pricing.</h2>
        <p className="text-gray-500 text-lg leading-relaxed mb-10">
          Build and preview free. Pay once for 12 months to publish, track, and grow.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

          {/* FREE */}
          <div className={`${card} border-gray-200`}>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Free</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₦0</p>
            <p className="text-sm text-gray-600 mb-5">Always free</p>
            <ul className={list}><Features plan="free" tick="text-gray-500" /></ul>
            <Link href={CREATE_HREF} className={`${cta} border-2 border-gray-200 text-gray-700 hover:border-gray-300`}>
              Get started free
            </Link>
          </div>

          {/* BASIC: the recommended plan */}
          <div className={`${card} border-[#0A66C2] shadow-lg shadow-[#0A66C2]/10`}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A66C2] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              Recommended
            </span>
            <p className="text-xs font-bold text-[#0A66C2] uppercase tracking-widest mb-2">Basic</p>
            <PriceTag plan="basic" variant="section" />
            <p className="text-sm text-gray-600 mb-5">For job seekers</p>
            <ul className={list}><Features plan="basic" tick="text-[#0A66C2]" /></ul>
            <Link href={CREATE_HREF} className={`${cta} border-2 border-[#0A66C2] bg-[#0A66C2] text-white hover:bg-[#084D9A] hover:border-[#084D9A]`}>
              Get started →
            </Link>
          </div>

          {/* PRO */}
          <div className={`${card} border-gray-200`}>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Pro</p>
            <PriceTag plan="pro" variant="section" />
            <p className="text-sm text-gray-600 mb-5">For serious applicants</p>
            <ul className={`${list} mb-4`}>
              <Features plan="pro" tick="text-[#0A66C2]" />
            </ul>
            {soon.length > 0 && (
              <div className="mb-6 border-t border-gray-200 pt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Coming soon</p>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  {soon.map((x) => (
                    <li key={x.id} className="flex items-start gap-2">
                      <span className="flex-shrink-0 leading-5" aria-hidden="true">·</span>
                      <span>{x.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-600">Not included yet. No dates promised.</p>
              </div>
            )}
            <Link href={CREATE_HREF} className={`${cta} border-2 border-gray-200 text-gray-700 hover:border-gray-300`}>
              Go Pro →
            </Link>
          </div>

        </div>
        <p className="text-center text-sm text-gray-600 mt-6">{BILLING_COPY.pricingNote}</p>
      </div>
    </section>
  )
}
