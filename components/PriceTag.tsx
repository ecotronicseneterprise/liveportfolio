'use client'

import { useRegion } from '@/hooks/useRegion'
import { useUsdRate } from '@/hooks/useUsdRate'
import { PLANS } from '@/lib/plans'
import { BILLING_COPY, formatNaira } from '@/lib/billing/copy'

/**
 * The price, always in Naira (that is what is charged). Visitors outside Nigeria also see an estimate in dollars, clearly labelled as an
 * estimate; the dollar figure is never presented as the price and never decides what is charged.
 */
export default function PriceTag({ plan, variant }: { plan: 'basic' | 'pro'; variant: 'section' | 'modal' }) {
  const { region } = useRegion()
  const { basicUsd, proUsd } = useUsdRate()
  const naira = formatNaira(PLANS[plan].priceNgn ?? 0)
  const usd = plan === 'pro' ? proUsd : basicUsd
  const big = variant === 'section' ? 'text-3xl font-bold text-gray-900 mb-1' : 'text-2xl font-bold text-gray-900 mt-0.5'
  const small = variant === 'section' ? 'text-base font-normal text-gray-600' : 'text-sm font-normal text-gray-600'
  return (
    <div>
      <p className={big}>
        {naira} <span className={small}>{BILLING_COPY.period}</span>
      </p>
      {region === 'INTL' && usd ? (
        <p className="text-xs text-gray-600 mt-0.5">About ${usd} at today&apos;s rate. {BILLING_COPY.nairaNote}</p>
      ) : null}
    </div>
  )
}
