import type { ReactNode } from 'react'
import SansShell from '@/components/landing/SansShell'

export default function OauthLayout({ children }: { children: ReactNode }) {
  return <SansShell>{children}</SansShell>
}
