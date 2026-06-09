import type { Metadata } from 'next'
import './globals.css'
import TrackingScripts from '@/components/TrackingScripts'

export const metadata: Metadata = {
  title: 'LivePortfolio — Create a Professional Portfolio Website for Job Seekers',
  description: 'Build a professional portfolio website in minutes. Upload your CV or answer a few questions and share your portfolio link in job applications. Track who views you.',
  keywords: [
    'online portfolio for job seekers',
    'CV website',
    'create portfolio for job applications',
    'online resume website',
    'portfolio website Nigeria',
    'job application portfolio',
    'professional portfolio builder',
    'online CV Africa',
  ],
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'LivePortfolio — Create a Professional Portfolio Website for Job Seekers',
    description: 'Build a professional portfolio website in minutes. Upload your CV, share your link in job applications, and know exactly when someone views it.',
    url: 'https://liveportfolio.site',
    siteName: 'liveportfolio.site',
    type: 'website',
    images: [
      {
        url: 'https://liveportfolio.site/logo-1024.png',
        width: 1024,
        height: 1024,
        alt: 'LivePortfolio — Professional portfolio websites for job seekers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LivePortfolio — Create a Professional Portfolio Website for Job Seekers',
    description: 'Build a professional portfolio website in minutes. Upload your CV, share your link in job applications, and know exactly when someone views it.',
    images: ['https://liveportfolio.site/logo-1024.png'],
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
