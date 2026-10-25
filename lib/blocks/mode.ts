// Which renderer draws a stored portfolio. The rule that keeps every existing portfolio exactly as it is:
//   - a portfolio WITHOUT a valid `content.layout` is legacy and goes through today's template component, untouched;
//   - a portfolio WITH a valid layout AND one of the three free template ids goes through the block renderer;
//   - a Pro template id always goes through its legacy component (the layout is kept in the data and ignored until a free id is chosen again).
import type { PortfolioContent } from '@/components/templates/Minimal'
import { isLookTemplate } from './presets'
import { parseLayout, type LayoutSettings } from './settings'

/** What is stored: today's content plus the optional layout. (The legacy templates never see the extra key.) */
export type StoredContent = PortfolioContent & { layout?: unknown }

/** The layout to draw with, or null when the portfolio is legacy. */
export function storedLayout(content: Partial<StoredContent> | null | undefined, template: string): LayoutSettings | null {
  if (!isLookTemplate(template)) return null
  return parseLayout(content?.layout)
}
