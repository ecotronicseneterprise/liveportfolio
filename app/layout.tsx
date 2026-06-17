import type { Metadata } from 'next'
import './globals.css'
import TrackingScripts from '@/components/TrackingScripts'

export const metadata: Metadata = {
  title: 'LivePortfolio — Create a Professional Portfolio Website in minutes',
  description: 'Turn your CV into a professional portfolio website in minutes. Used by developers, designers, and job seekers worldwide.',
  keywords: [
    'portfolio website',
    'professional portfolio',
    'AI portfolio builder',
    'job seeker portfolio',
    'developer portfolio',
    'data scientist portfolio',
    'remote jobs portfolio',
    'hireable online',
    'CV to portfolio',
    'portfolio for job seekers',
  ],
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'LivePortfolio — Create a Professional Portfolio Website in minutes',
    description: 'Turn your CV into a professional portfolio website in minutes. Used by developers, designers, and job seekers worldwide.',
    url: 'https://liveportfolio.site',
    siteName: 'LivePortfolio',
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
    title: 'LivePortfolio — Build a Portfolio That Gets You Hired',
    description: 'Build a professional portfolio website in minutes. Share your link in job applications.',
    images: ['https://liveportfolio.site/logo-1024.png'],
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
