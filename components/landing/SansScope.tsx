import type { ReactNode } from 'react'
import { studioFonts } from '@/components/blocks/looks/fonts-studio'

// Sets ONLY the site's sans-serif text face on a wrapper (no colours, no heading rules), for pages that used to fall back to the
// browser's default serif. Deliberately not applied to portfolio pages, previews, the create flow or templates, which set their own fonts.
export const SANS_STACK = 'var(--f-studio-text), var(--f-studio-text-ext), system-ui, sans-serif'

export default function SansScope({ children }: { children: ReactNode }) {
  return <div className={studioFonts} style={{ fontFamily: SANS_STACK }}>{children}</div>
}
