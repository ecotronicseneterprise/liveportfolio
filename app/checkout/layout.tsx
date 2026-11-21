import type { ReactNode } from 'react'
import SansScope from '@/components/landing/SansScope'

// The site's sans-serif face (these pages used to show the browser's default serif).
export default function Layout({ children }: { children: ReactNode }) {
  return <SansScope>{children}</SansScope>
}
