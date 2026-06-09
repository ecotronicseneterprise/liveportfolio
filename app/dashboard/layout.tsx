import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — LivePortfolio',
  description: 'Manage your portfolio, track who views you, and update your content from your LivePortfolio dashboard.',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
