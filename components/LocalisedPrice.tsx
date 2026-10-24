'use client'

import { useRegion } from '@/hooks/useRegion'

interface Props {
  ngn: string // the price as charged, e.g. "₦15,000 for 12 months"
  usd: string // the estimate shown to visitors outside Nigeria, e.g. "$10"
}

/** Always the Naira price. Outside Nigeria an estimate is added and labelled as such: the charge is in Naira. */
export default function LocalisedPrice({ ngn, usd }: Props) {
  const { region } = useRegion()
  return <span>{region === 'INTL' ? `${ngn} (about ${usd} at today's rate, charged in Naira)` : ngn}</span>
}
