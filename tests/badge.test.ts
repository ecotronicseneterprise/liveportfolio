// The "Built with LivePortfolio" badge: on every published page except Pro, a real tagged link, and removable per page.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import Minimal, { type PortfolioContent } from '../components/templates/Minimal'
import Bold from '../components/templates/Bold'
import Developer from '../components/templates/Developer'
import Finance from '../components/templates/Finance'
import Look from '../components/blocks/Look'
import { entitlementsFor } from '../lib/plans'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'

const content = SAMPLE_PEOPLE.engineer as unknown as PortfolioContent
const HREF = 'https://liveportfolio.site/?utm_source=portfolio&utm_medium=badge&utm_campaign=ada'
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n')

describe('who gets the badge', () => {
  it('free, basic and published pages carry it; only Pro removes it', () => {
    expect(entitlementsFor('free').noBadge).toBe(false)
    expect(entitlementsFor('basic').noBadge).toBe(false)
    expect(entitlementsFor('pro').noBadge).toBe(true)
  })
})

describe('older templates', () => {
  const legacy: Array<[string, React.ComponentType<{ content: PortfolioContent; credit?: boolean; creditHref?: string }>]> = [
    ['minimal', Minimal], ['bold', Bold], ['developer', Developer], ['finance', Finance],
  ]
  for (const [id, C] of legacy) {
    it(`${id}: the badge is shown by default, links where told, and is gone when credit is false`, () => {
      const on = renderToStaticMarkup(createElement(C, { content }))
      expect(on).toContain('Built with liveportfolio.site')
      expect(on).toContain('href="https://liveportfolio.site"') // unchanged default
      const tagged = renderToStaticMarkup(createElement(C, { content, credit: true, creditHref: HREF }))
      expect(tagged).toContain(`href="${HREF.replace(/&/g, '&amp;')}"`)
      const off = renderToStaticMarkup(createElement(C, { content, credit: false, creditHref: HREF }))
      expect(off).not.toContain('Built with liveportfolio.site')
      expect(off).not.toContain('utm_medium=badge')
    })
  }
})

describe('new designs (blocks)', () => {
  const layout = { v: 1, arrangement: 'profile' } as const
  it('the badge is a real tagged link when an address is given, and plain text without one', () => {
    const linked = renderToStaticMarkup(createElement(Look, { template: 'minimal', content, layout, page: true, credit: true, creditHref: HREF }))
    expect(linked).toContain(`<a href="${HREF.replace(/&/g, '&amp;')}" target="_blank" rel="noopener noreferrer">`)
    const plain = renderToStaticMarkup(createElement(Look, { template: 'minimal', content, layout, page: true, credit: true }))
    expect(plain).toContain('<footer class="foot">')
    expect(plain).not.toContain('utm_medium=badge')
  })
  it('credit false removes the whole footer', () => {
    const off = renderToStaticMarkup(createElement(Look, { template: 'minimal', content, layout, page: true, credit: false, creditHref: HREF }))
    expect(off).not.toContain('class="foot"')
    expect(off).not.toContain('utm_medium=badge')
  })
})

describe('the public page', () => {
  const page = read('../app/portfolio/[slug]/page.tsx')
  it('decides the badge from the plan entitlement, and tags the link with the portfolio address', () => {
    expect(page).toContain('entitlementsFor(planFromUserColumn(')
    expect(page).toContain('.noBadge')
    expect(page).toContain('utm_source=portfolio&utm_medium=badge&utm_campaign=${encodeURIComponent(slug)}')
    expect(page).toContain('credit={badge} creditHref={creditHref}')
    expect(page).toContain("new Set(['minimal', 'bold', 'developer', 'finance'])")
  })
})

describe('the pricing promise', () => {
  it('says Pro has no badge, and the site never promises Basic a badge-free page', () => {
    expect(entitlementsFor('pro')).toBeTruthy()
    const plans = read('../lib/plans.ts')
    expect(plans).toContain("label: 'No LivePortfolio badge on your page'")
    expect(plans).toMatch(/no_badge[^\n]*plans: \['pro'\]/)
  })
})
