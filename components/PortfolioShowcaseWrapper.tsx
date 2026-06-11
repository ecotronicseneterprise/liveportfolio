'use client'

import dynamic from 'next/dynamic'

const PortfolioShowcase = dynamic(
  () => import('@/components/PortfolioShowcase'),
  { ssr: false, loading: () => <div style={{ height: 500 }} /> }
)

export default function PortfolioShowcaseWrapper() {
  return <PortfolioShowcase />
}
