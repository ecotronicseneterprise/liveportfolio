// Which renderer draws a stored portfolio. Everyone gets the new look:
//   - one of the three free template ids always goes through the block renderer; a portfolio saved before the redesign (no valid
//     `content.layout`) gets the best arrangement for its content, derived on the fly and stored the next time the owner saves;
//   - a Pro template id goes through its Pro component (redesigned by default, see lib/portfolio/presentation.ts).
import type { PortfolioContent } from '@/components/templates/Minimal'
import { isLookTemplate, layoutForTemplate } from './presets'
import { parseLayout, type LayoutSettings } from './settings'

/** What is stored: today's content plus the optional layout. (The legacy templates never see the extra key.) */
export type StoredContent = PortfolioContent & { layout?: unknown }

/** The layout to draw with, or null for a Pro template. */
export function storedLayout(content: Partial<StoredContent> | null | undefined, template: string): LayoutSettings | null {
  if (!isLookTemplate(template)) return null
  return parseLayout(content?.layout) ?? layoutForTemplate(content, template)
}
