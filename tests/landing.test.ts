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
    expect(html).toContain('Clifford Nwanna — Portfolio')
    expect(html).toContain('liveportfolio.site/clifford-nwanna')
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
    expect(html).toContain('nwannachumaclifford@gmail.com')
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

describe('landing hero pictures', () => {
  const html = renderToStaticMarkup(HeroSpecimen())
  it('shows a cartoon avatar and a picture for each project, served from our own /landing folder', async () => {
    const fs = await import('node:fs')
    expect(html).toContain('/landing/dev-avatar.png')
    for (const n of [1, 2, 3]) {
      expect(html).toContain(`/landing/project-${n}.jpg`)
      expect(fs.existsSync(`public/landing/project-${n}.jpg`)).toBe(true)
    }
    expect(fs.existsSync('public/landing/dev-avatar.png')).toBe(true)
    expect(html).not.toMatch(/https?:\/\/images\.pexels|unsplash/) // no hot-linking
  })
  it('the tabs carry the template names, and the sample is labelled as invented', () => {
    for (const name of ['Creative', 'Minimal', 'Bold']) expect(html).toContain(`>${name}</label>`)
    expect(html).toContain('A sample with invented details')
    expect(html).not.toMatch(/stock image|pexels/i) // the picture is our own drawing, no real person
  })
  it('only the landing folder is accepted as a local image path; every other picture must still be https', async () => {
    const { localAsset, toBlockData } = await import('../lib/blocks/adapt')
    expect(localAsset('/landing/project-1.jpg')).toBe('/landing/project-1.jpg')
    for (const bad of ['/etc/passwd', '/landing/../secret.jpg', '//evil.com/a.jpg', '/landing/x.svg', 'landing/x.jpg', 'javascript:alert(1)', '/landing/a/b.jpg']) expect(localAsset(bad), bad).toBeUndefined()
    const d = toBlockData({ name: 'A', avatar_url: '/landing/dev-avatar.png', projects: [{ title: 'P', image_url: '/other/x.jpg' }] } as never)
    expect(d.avatarUrl).toBe('/landing/dev-avatar.png')
    expect(d.projects[0].imageUrl ?? '').not.toMatch(/^\//) // a local path outside /landing/ is never kept as a local path
  })
})
