// Picks the look for a template id and draws the portfolio. One of the three FREE template ids (minimal, bold, creative) with a valid layout
// goes through here; everything else is legacy. Server-safe (no hooks).
import type { PortfolioContent } from '@/components/templates/Minimal'
import { themeForTemplate } from '@/lib/blocks/presets'
import type { LayoutSettings } from '@/lib/blocks/settings'
import type { BlockPortfolioProps } from './BlockPortfolio'
import Journal from './looks/Journal'
import Ledger from './looks/Ledger'
import Studio from './looks/Studio'

export default function Look({ template, content, layout, ...rest }: { template: string; content: Partial<PortfolioContent>; layout: LayoutSettings } & Omit<BlockPortfolioProps, 'theme' | 'fontClass' | 'content' | 'layout'>) {
  switch (themeForTemplate(template)) {
    case 'studio': return <Studio content={content} layout={layout} {...rest} />
    case 'journal': return <Journal content={content} layout={layout} {...rest} />
    case 'ledger': return <Ledger content={content} layout={layout} {...rest} />
    default: return null
  }
}
