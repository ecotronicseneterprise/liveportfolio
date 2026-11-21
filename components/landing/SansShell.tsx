import type { ReactNode } from 'react'
import '@/components/landing/landing.css'
import { studioFonts } from '@/components/blocks/looks/fonts-studio'

// The site's sans-serif text face for pages outside the landing page. Without it the browser's default serif shows, because the
// Tailwind font stack points at variables nothing defines (see landing.css).
export default function SansShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`lpl ${studioFonts} min-h-screen ${className}`}>{children}</div>
}
