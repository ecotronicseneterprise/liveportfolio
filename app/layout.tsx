import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LivePortfolio — AI Career Profile Builder',
  description: 'Build your AI career profile in 10 minutes. Know if recruiters are finding you. From $9/year.',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'LivePortfolio — Know if recruiters are finding you',
    description: 'AI-powered career profiles with recruiter analytics. Build in 10 minutes. From $9/year.',
    url: 'https://liveportfolio.site',
    siteName: 'liveportfolio.site',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LivePortfolio — Know if recruiters are finding you',
    description: 'AI-powered career profiles with recruiter analytics. Build in 10 minutes. From $9/year.',
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
      <body>{children}</body>
    </html>
  )
}
