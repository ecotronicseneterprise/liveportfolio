import type { Metadata } from 'next'
import './globals.css'
import TrackingScripts from '@/components/TrackingScripts'

export const metadata: Metadata = {
  title: 'LivePortfolio — Your professional portfolio, live in minutes',
  description: 'Build your professional portfolio in 10 minutes. Know if recruiters are finding you. From $9/year.',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'LivePortfolio — Know if recruiters are finding you',
    description: 'Professional career profiles with recruiter analytics. Build in 10 minutes. From $9/year.',
    url: 'https://liveportfolio.site',
    siteName: 'liveportfolio.site',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LivePortfolio — Know if recruiters are finding you',
    description: 'Professional career profiles with recruiter analytics. Build in 10 minutes. From $9/year.',
  },
  alternates: {
    canonical: 'https://liveportfolio.site',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TrackingScripts />
        {children}
      </body>
    </html>
  )
}
