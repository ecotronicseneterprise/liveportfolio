// The landing page's hero specimen: a real block-rendered portfolio with a CSS-only look switch (no script, no carousel, no autoplay).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HeroSpecimen from '../components/landing/HeroSpecimen'
import LooksSection from '../components/landing/LooksSection'
import { t } from '../lib/onboarding/t'

const root = join(__dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const css = read('components/landing/landing.css').replace(/\/\*[\s\S]*?\*\//g, '')

describe('landing hero specimen', () => {
  const html = renderToStaticMarkup(HeroSpecimen())

  it('renders all three looks as server HTML, readable without JavaScript', () => {
    expect(html).toContain('spec-pane-studio')
    expect(html).toContain('spec-pane-journal')
    expect(html).toContain('spec-pane-ledger')
    expect(html).toContain(t('landing.specimenName'))
    expect(html).not.toContain('<script')
  })

  it('switches with radio inputs and sibling selectors, one checked by default', () => {
    expect(html.match(/type="radio"/g)).toHaveLength(3)
    expect(html.match(/checked=""/g)).toHaveLength(1)
    for (const id of ['studio', 'journal', 'ledger']) expect(css).toContain(`#spec-${id}:checked ~ .browser-window .spec-frame .spec-pane-${id}`)
    expect(css).toMatch(/\.spec-pane \{ display: none;/)
  })

  it('has a fixed-height frame, so switching never shifts the page', () => {
    expect(css).toMatch(/\.browser-window \{ height: \d+px;/) // the window has a fixed height; the frame fills it
  })

  it('keeps hidden panes out of the tab order and labels it as a sample', () => {
    expect(html.match(/inert=""/g)).toHaveLength(3)
    expect(html).toContain(t('landing.specimenNote'))
    expect(html).toContain('class="browser-window"')
    expect(html).toContain('Ada Okonkwo — Portfolio')
    expect(html).toContain('liveportfolio.site/ada-okonkwo')
  })

  it('has no autoplay, carousel, gradient or script-driven motion', () => {
    expect(css).not.toMatch(/gradient|@keyframes|animation/i)
    const src = read('components/landing/HeroSpecimen.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(src).not.toMatch(/use client|setInterval|setTimeout|swiper|embla|carousel/i)
  })

  it('respects reduced motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('uses a contact address that is not a real person', () => {
    expect(html).toContain('ada@example.com')
  })
})

describe('landing page wiring', () => {
  it('uses the specimen and looks section, and the old slideshow is gone', () => {
    const page = read('app/page.tsx')
    expect(page).toContain('HeroSpecimen')
    expect(page).toContain('LooksSection')
    expect(page).not.toMatch(/PortfolioShowcase/)
  })

  it('keeps prices in Naira and shows no dollar prices in the pricing section', () => {
    const pricing = read('components/PricingSection.tsx')
    expect(pricing).not.toMatch(/\$\s?\d/)
  })

  it('looks section takes every string from the messages file', () => {
    const html = renderToStaticMarkup(LooksSection())
    for (const id of ['studio', 'journal', 'ledger']) expect(html).toContain(t(`portfolio.look.${id}`))
    expect(html).toContain(t('landing.looksTitle'))
  })
})
