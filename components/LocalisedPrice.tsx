'use client'

import { useRegion } from '@/hooks/useRegion'

interface Props {
  ngn: string   // e.g. "₦15,000/year"
  usd: string   // e.g. "$10/year"
  fallback?: string // shown while region loads (defaults to usd)
}

export default function LocalisedPrice({ ngn, usd, fallback }: Props) {
  const { region } = useRegion()
  if (region === null) return <span>{fallback ?? usd}</span>
  return <span>{region === 'NG' ? ngn : usd}</span>
}
