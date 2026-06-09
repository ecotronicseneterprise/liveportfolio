import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Portfolio — LivePortfolio',
  description: 'Upload your CV or answer a few questions. We write your portfolio copy and build your page. Share the link in your next job application.',
  alternates: {
    canonical: 'https://liveportfolio.site/create',
  },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
