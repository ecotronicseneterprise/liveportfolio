import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'liveportfolio.site — Your professional portfolio in 5 minutes',
  description: 'Fill in your info. AI writes the copy. Your portfolio goes live in minutes.',
  icons: {
    icon: '/icon',
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
