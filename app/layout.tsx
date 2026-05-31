import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'liveportfolio.site — Your professional portfolio in 5 minutes',
  description: 'Fill in your info. AI writes the copy. Your portfolio goes live in minutes. One-time $5. No subscription.',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'liveportfolio.site — Professional portfolio in 5 minutes',
    description: 'AI-powered portfolio builder for tech professionals. Fill in your experience, AI writes the copy, go live instantly.',
    url: 'https://liveportfolio.site',
    siteName: 'liveportfolio.site',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'liveportfolio.site — Professional portfolio in 5 minutes',
    description: 'AI-powered portfolio builder for tech professionals. Fill in your experience, AI writes the copy, go live instantly.',
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
