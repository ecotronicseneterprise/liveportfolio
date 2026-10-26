import type { Metadata } from 'next'
import './globals.css'
import TrackingScripts from '@/components/TrackingScripts'
import ConsentBanner from '@/components/ConsentBanner'

export const metadata: Metadata = {
  title: 'LivePortfolio — Build a professional portfolio in minutes',
  description: 'Upload your CV and we turn it into a professional portfolio website. Build your online presence and know when someone views your profile.',
  keywords: [
    'portfolio website',
    'professional portfolio',
    'online portfolio',
    'portfolio builder',
    'developer portfolio',
    'data scientist portfolio',
    'product manager portfolio',
    'CV to portfolio website',
    'hireable online',
    'portfolio for job seekers',
    'Nigeria portfolio website',
    'African tech professionals',
  ],
  metadataBase: new URL('https://liveportfolio.site'),
  // the share image comes from app/opengraph-image.tsx and app/twitter-image.tsx (the real logo)
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'LivePortfolio — Build a professional portfolio in minutes',
    description: 'Upload your CV and we turn it into a professional portfolio website. Build your online presence and know when someone views your profile.',
    url: 'https://liveportfolio.site',
    siteName: 'LivePortfolio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LivePortfolio — Build a Portfolio That Gets You Hired',
    description: 'Upload your CV and we tell your story. Build your online presence and see when someone from a new country opens your portfolio — in real time.',
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
        <main>{children}</main>
        <ConsentBanner />
      </body>
    </html>
  )
}
