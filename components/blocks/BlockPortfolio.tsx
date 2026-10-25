// The block portfolio: one theme, one arrangement of blocks, drawn from the person's content. No hooks and no client JS, so on the public
// page it ships as plain HTML. The theme's fonts come in through `fontClass` (see looks/*), so a page loads only its own theme's fonts.
import type { CSSProperties } from 'react'
import type { PortfolioContent } from '@/components/templates/Minimal'
import { t } from '@/lib/onboarding/t'
import { toBlockData } from '@/lib/blocks/adapt'
import { ARRANGEMENT_SECTIONS, type SectionSpec, type Theme } from '@/lib/blocks/presets'
import { ACCENTS, DENSITY_FACTOR, type LayoutSettings } from '@/lib/blocks/settings'
import { presentAnchors, renderSection, type BlockCtx } from './blocks'
import './blocks.css'

export interface BlockPortfolioProps {
  content: Partial<PortfolioContent>
  layout: LayoutSettings
  theme: Theme
  /** Classes that define the theme's font variables (from looks/fonts-*). */
  fontClass?: string
  /** A whole public page (sticky top bar, skip link) or an embedded specimen (thumbnail, landing). */
  page?: boolean
  /** Prefix for anchor ids, so several on one page never collide. */
  idPrefix?: string
  /** Override the sections (the landing specimen shows a trimmed version). */
  sections?: SectionSpec[]
  /** Show the "Built with liveportfolio.site" footer (free and unpublished portfolios). Default true. */
  credit?: boolean
}

const BASE_SECTION_PX: Record<Theme, number> = { studio: 88, journal: 104, ledger: 64 }
const BASE_SECTION_PX_MOBILE: Record<Theme, number> = { studio: 56, journal: 64, ledger: 44 }

export default function BlockPortfolio({ content, layout, theme, fontClass = '', page = false, idPrefix = 'lpb', sections, credit = true }: BlockPortfolioProps) {
  const d = toBlockData(content)
  const ctx: BlockCtx = { idp: idPrefix, bioShort: layout.bio === 'short', projectLimit: Number.POSITIVE_INFINITY }
  const specs = sections ?? ARRANGEMENT_SECTIONS[layout.arrangement]
  const anchors = presentAnchors(d)
  const label: Record<'work' | 'experience' | 'contact', string> = { work: t('portfolio.work'), experience: t('portfolio.experience'), contact: t('portfolio.contact') }

  // Presentation settings become CSS variables on the root: an accent override and the spacing density. Nothing else is configurable.
  const style: CSSProperties & Record<string, string> = {}
  const factor = DENSITY_FACTOR[layout.density ?? 'comfortable']
  if (factor !== 1) {
    style['--sec'] = `${Math.round(BASE_SECTION_PX[theme] * factor)}px`
    style['--sec-m'] = `${Math.round(BASE_SECTION_PX_MOBILE[theme] * factor)}px`
  }
  if (layout.accent) {
    const a = ACCENTS[layout.accent]
    style['--accent'] = a.text
    style['--fill'] = a.fill
    style['--tint'] = a.tint
  }

  return (
    <div className={`lpb ${fontClass}`.trim()} data-theme={theme} data-page={page ? '' : undefined} style={style}>
      {page && <a className="skip" href={`#${idPrefix}-main`}>{t('portfolio.skip')}</a>}
      <header className="topbar">
        <div className="wrap">
          {/* no name or brand in the bar: the name is the page's heading, so it is never shown twice */}
          {anchors.length > 0 && (
            <nav aria-label={t('portfolio.nav')}>
              {anchors.map((a) => <a key={a} href={`#${idPrefix}-${a}`}>{label[a]}</a>)}
            </nav>
          )}
        </div>
      </header>
      <main id={`${idPrefix}-main`}>{specs.map((s, i) => <FragmentKey key={`${s.block}-${i}`}>{renderSection(s, d, ctx)}</FragmentKey>)}</main>
      {credit && (
        <footer className="foot">
          <div className="wrap"><span>{t('portfolio.builtWith')}</span></div>
        </footer>
      )}
    </div>
  )
}

// keeps the section list keyed without adding wrapper elements
function FragmentKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
