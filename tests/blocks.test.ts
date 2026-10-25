// The block renderer: settings, adapter, presets and what is actually drawn, for every theme x arrangement x fixture (full, sparse, long,
// no figures). Plus the design rules that can be checked mechanically: contrast, tap targets, scoped CSS, no gradients, no hard-coded words.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import Look from '../components/blocks/Look'
import { toBlockData, safeUrl } from '../lib/blocks/adapt'
import {
  ARRANGEMENT_SECTIONS, TEMPLATE_BY_THEME, THEMES, THEME_BY_TEMPLATE, isLookTemplate, kindFromRole, layoutForTemplate, rank, recommend, themeForTemplate,
} from '../lib/blocks/presets'
import { ACCENTS, ARRANGEMENTS, DENSITIES, LayoutSettings, defaultLayout, parseLayout } from '../lib/blocks/settings'
import { LONG_STRINGS, ONE_PROJECT_NO_FIGURES, SAMPLE_PEOPLE, SPARSE } from '../lib/blocks/sample'
import { ALL_TEMPLATES, FREE_TEMPLATES, PRO_TEMPLATES } from '../lib/plans'
import { t } from '../lib/onboarding/t'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const FIXTURES = { ...SAMPLE_PEOPLE, sparse: SPARSE, long: LONG_STRINGS, noimg: ONE_PROJECT_NO_FIGURES }
const html = (template: string, content: object, arrangement: (typeof ARRANGEMENTS)[number]) =>
  renderToStaticMarkup(createElement(Look, { template, content, layout: defaultLayout(arrangement), page: true, idPrefix: 'x' } as never))

// WCAG contrast
const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

describe('layout settings (stored inside the portfolio JSON)', () => {
  it('a valid layout parses; absent, null, wrong or extra keys mean "no layout" (legacy), never an error', () => {
    expect(parseLayout({ v: 1, arrangement: 'proof' })).toEqual({ v: 1, arrangement: 'proof' })
    expect(parseLayout({ v: 1, arrangement: 'index', accent: 'teal', density: 'airy', bio: 'short' })).toBeTruthy()
    for (const bad of [undefined, null, {}, [], 'proof', 5, { v: 2, arrangement: 'proof' }, { v: 1, arrangement: 'carousel' }, { v: 1, arrangement: 'proof', css: 'x' }, { v: 1, arrangement: 'proof', accent: '#ff00ff' }, { v: 1, arrangement: 'proof', density: 'tiny' }]) {
      expect(parseLayout(bad), JSON.stringify(bad)).toBeNull()
    }
  })
  it('contains no words, no CSS, no fonts: only choices from fixed lists', () => {
    expect(Object.keys(LayoutSettings.shape).sort()).toEqual(['accent', 'arrangement', 'bio', 'density', 'v'])
  })
  it('every curated accent meets 4.5:1: text on white, white on its fill, text on its tint', () => {
    for (const [id, a] of Object.entries(ACCENTS)) {
      expect(ratio(a.text, '#FFFFFF'), `${id} text on white`).toBeGreaterThanOrEqual(4.5)
      expect(ratio('#FFFFFF', a.fill), `${id} white on fill`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(a.text, a.tint), `${id} text on tint`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('the three densities exist', () => expect([...DENSITIES]).toEqual(['compact', 'comfortable', 'airy']))
})

describe('presets and the default look', () => {
  it('the three free template ids ARE the three looks, one to one, so plan gating is unchanged', () => {
    expect(Object.keys(THEME_BY_TEMPLATE).sort()).toEqual([...FREE_TEMPLATES].sort())
    for (const th of THEMES) expect(THEME_BY_TEMPLATE[TEMPLATE_BY_THEME[th]]).toBe(th)
    for (const pro of PRO_TEMPLATES) { expect(isLookTemplate(pro)).toBe(false); expect(themeForTemplate(pro)).toBeNull() }
    expect(ALL_TEMPLATES).toHaveLength(10)
  })
  it('kindFromRole', () => {
    expect(kindFromRole('Backend engineer')).toBe('engineer')
    expect(kindFromRole('Data scientist')).toBe('engineer')
    expect(kindFromRole('Physiotherapist, sports and orthopaedic rehabilitation')).toBe('clinician')
    expect(kindFromRole('Product designer')).toBe('designer')
    expect(kindFromRole('Financial analyst, ACCA')).toBe('finance')
    expect(kindFromRole('Marketing manager')).toBe('other')
    expect(kindFromRole('')).toBe('other'); expect(kindFromRole(undefined)).toBe('other'); expect(kindFromRole(null)).toBe('other')
  })
  it('ranking is deterministic and complete (12 looks)', () => {
    for (const c of Object.values(FIXTURES)) {
      const a = rank(c).map((r) => `${r.theme}-${r.arrangement}`), b = rank(c).map((r) => `${r.theme}-${r.arrangement}`)
      expect(a).toEqual(b); expect(new Set(a).size).toBe(12)
    }
  })
  it('Studio (the Proof look) leads for anyone whose results carry figures', () => {
    for (const k of ['engineer', 'finance', 'clinician'] as const) expect(recommend(SAMPLE_PEOPLE[k]).template, k).toBe('creative')
    expect(recommend(SAMPLE_PEOPLE.engineer).layout.arrangement).toMatch(/proof|index/)
  })
  it('without figures the Proof arrangement is not first, and images lift the showcase', () => {
    const noFig = { ...SAMPLE_PEOPLE.engineer, projects: SAMPLE_PEOPLE.engineer.projects.map((p) => ({ ...p, outcome: 'Shipped it' })) }
    expect(rank(noFig)[0].arrangement).not.toBe('proof')
    const withImg = { ...SAMPLE_PEOPLE.designer, projects: SAMPLE_PEOPLE.designer.projects.map((p) => ({ ...p, image_url: 'https://x/y.png' })) }
    expect(rank(withImg)[0].arrangement).toBe('showcase')
    expect(rank(SAMPLE_PEOPLE.designer).slice(0, 3).some((r) => r.arrangement === 'showcase')).toBe(false) // no images yet
  })
  it('sparse content never gets the arrangement that depends on projects', () => {
    expect(rank(SPARSE)[0].arrangement).not.toBe('index')
  })
  it('layoutForTemplate: the best arrangement within the chosen look; null for a Pro template (legacy)', () => {
    for (const tpl of FREE_TEMPLATES) expect(layoutForTemplate(SAMPLE_PEOPLE.engineer, tpl)).toMatchObject({ v: 1 })
    for (const pro of PRO_TEMPLATES) expect(layoutForTemplate(SAMPLE_PEOPLE.engineer, pro)).toBeNull()
    expect(layoutForTemplate(SAMPLE_PEOPLE.engineer, 'nope')).toBeNull()
  })
  it('every arrangement is hero first and ends with contact; blocks appear at most once', () => {
    for (const a of ARRANGEMENTS) {
      const s = ARRANGEMENT_SECTIONS[a]
      expect(s[0].block).toBe('hero'); expect(s.at(-1)!.block).toBe('contact')
      expect(new Set(s.map((x) => x.block)).size).toBe(s.length)
    }
  })
})

describe('adapter: stored content is untrusted and may be anything', () => {
  it('survives null, empty and garbage without throwing', () => {
    for (const c of [null, undefined, {}, { name: 5, projects: 'x', skills_grouped: {}, experience: [null, 1, 'a'], testimonials: [{}], about: [], links: 3 }]) {
      expect(() => toBlockData(c as never)).not.toThrow()
    }
    const d = toBlockData({ name: 5, projects: 'x' } as never)
    expect(d.name).toBe(''); expect(d.projects).toEqual([])
  })
  it('only web addresses become links; javascript:, data:, credentials and junk are dropped; a bare domain gets https', () => {
    expect(safeUrl('https://github.com/ada')).toBe('https://github.com/ada')
    expect(safeUrl('github.com/ada')).toBe('https://github.com/ada')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'https://u:p@evil.com', 'ftp://x.com', '', '   ', 5, null, 'not a url at all']) expect(safeUrl(bad), String(bad)).toBeUndefined()
    const d = toBlockData({ ...SAMPLE_PEOPLE.engineer, github_url: 'javascript:alert(1)', linkedin_url: 'linkedin.com/in/ada' })
    expect(d.links).toEqual([{ label: t('portfolio.linkedin'), url: 'https://linkedin.com/in/ada' }])
  })
  it('images must be https; an http or non-web image is dropped', () => {
    const d = toBlockData({ ...SPARSE, avatar_url: 'http://x.com/a.png', projects: [{ title: 'P', problem: '', solution: '', outcome: '', stack: [], image_url: 'javascript:1' }] })
    expect(d.avatarUrl).toBeUndefined(); expect(d.projects[0].imageUrl).toBeUndefined()
    expect(toBlockData({ ...SPARSE, avatar_url: 'https://x.com/a.png' }).avatarUrl).toBe('https://x.com/a.png')
  })
  it('About splits into paragraphs; flat skills become one group; the first testimonial with text and author is the quote; projects need a title', () => {
    const d = toBlockData({ ...SPARSE, about: 'One.\n\nTwo.\n\n\nThree.', skills: ['Go', 'SQL'], skills_grouped: [], testimonials: [{ text: '', author: 'x', role: '' }, { text: 'Great', author: 'Ada', role: 'CTO', company: 'Acme' }], projects: [{ title: '', problem: 'x', solution: '', outcome: '', stack: [] }] })
    expect(d.about).toEqual(['One.', 'Two.', 'Three.'])
    expect(d.skillGroups).toEqual([{ category: t('portfolio.skills'), items: ['Go', 'SQL'] }])
    expect(d.quote).toEqual({ text: 'Great', author: 'Ada', role: 'CTO, Acme' })
    expect(d.projects).toEqual([])
  })
})

describe('what is drawn: every theme x arrangement x fixture', () => {
  const cases = Object.entries(FIXTURES).flatMap(([k, c]) => FREE_TEMPLATES.flatMap((tpl) => ARRANGEMENTS.map((a) => [k, c, tpl, a] as const)))
  it(`renders all ${cases.length} combinations without throwing, without "undefined", "null" or "[object", and with the person's name`, () => {
    for (const [k, c, tpl, a] of cases) {
      const out = html(tpl, c, a)
      const text = out.replace(/<[^>]+>/g, ' ')
      expect(text, `${k}/${tpl}/${a}`).not.toMatch(/\bundefined\b|\bnull\b|\[object|NaN/)
      expect(out, `${k}/${tpl}/${a}`).toContain('class="lpb ')
      const name = (c as { name: string }).name
      expect(text.replace(/&amp;/g, '&')).toContain(name)
    }
  })
  it('anchor ids are unique on a page, and every nav link points at an id that exists', () => {
    for (const [k, c, tpl, a] of cases) {
      const out = html(tpl, c, a)
      const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
      expect(new Set(ids).size, `${k}/${tpl}/${a} duplicate ids`).toBe(ids.length)
      for (const m of out.matchAll(/<a href="#([^"]+)"/g)) expect(ids, `${k}/${tpl}/${a} dangling #${m[1]}`).toContain(m[1])
    }
  })
  it('no section is an empty heading: every <section> has content beyond its heading', () => {
    for (const [k, c, tpl, a] of cases) {
      const out = html(tpl, c, a)
      for (const sec of out.split('<section').slice(1)) {
        const body = sec.split('</section>')[0].replace(/<h2[^>]*>.*?<\/h2>/g, '').replace(/<[^>]+>/g, '').trim()
        expect(body.length, `${k}/${tpl}/${a} empty section: ${sec.slice(0, 80)}`).toBeGreaterThan(0)
      }
    }
  })
  it('sparse content (name and e-mail only) draws just the hero and contact', () => {
    for (const tpl of FREE_TEMPLATES) for (const a of ARRANGEMENTS) {
      const out = html(tpl, SPARSE, a)
      expect(out.match(/<section/g)?.length, `${tpl}/${a}`).toBe(2)
      expect(out).toContain('Chidi Eze'); expect(out).toContain('chidi@example.com')
    }
  })
  it('a name with no e-mail and no links draws no contact section at all', () => {
    const out = html('creative', { ...SPARSE, email: '' }, 'proof')
    expect(out).not.toContain('b-contact')
  })
  it('the figures are picked out of a result sentence, but a bare number or "p95" is not', () => {
    const out = html('creative', SAMPLE_PEOPLE.engineer, 'proof')
    expect(out).toContain('<mark>3 hours</mark>'); expect(out).toContain('<mark>9 minutes</mark>'); expect(out).toContain('<mark>40%</mark>')
    expect(out).not.toContain('<mark>95</mark>'); expect(out).not.toMatch(/<mark>6<\/mark>/)
  })
  it('all text is escaped: markup in a field is shown, never executed', () => {
    const out = html('minimal', { ...SPARSE, name: '<img src=x onerror=alert(1)>', headline: '</h1><script>alert(1)</script>' }, 'profile')
    expect(out).not.toContain('<script>'); expect(out).not.toContain('<img src=x')
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
  it('project links are rel=noopener and only web addresses; the project picture is https, sized and lazy', () => {
    const c = { ...SAMPLE_PEOPLE.engineer, projects: [{ ...SAMPLE_PEOPLE.engineer.projects[0], url: 'https://example.com/p', github_url: 'javascript:1', image_url: 'https://cdn.example.com/p.png' }] }
    const out = html('creative', c, 'showcase')
    expect(out).toContain('href="https://example.com/p" rel="noopener noreferrer"'); expect(out).not.toContain('javascript:')
    expect(out).toMatch(/<img class="pimg" src="https:\/\/cdn\.example\.com\/p\.png"[^>]*width="1280" height="800" loading="lazy"/)
  })
  it('a photo is drawn only when there is one, with a real alt text and fixed size (no layout shift)', () => {
    expect(html('creative', SAMPLE_PEOPLE.engineer, 'proof')).not.toContain('class="photo"')
    const out = html('creative', { ...SAMPLE_PEOPLE.engineer, avatar_url: 'https://cdn.example.com/a.jpg' }, 'proof')
    expect(out).toMatch(/class="photo" src="https:\/\/cdn\.example\.com\/a\.jpg" alt="Photo of Ada Okonkwo" width="176" height="176"/)
  })
  it('the portfolio name appears once in the identity hero, not again beside section navigation or in the footer', () => {
    const out = html('creative', SAMPLE_PEOPLE.engineer, 'proof')
    expect(out.match(/Ada Okonkwo/g)).toHaveLength(1)
    expect(out).not.toMatch(/class="brand"/) // nothing but the section links sits in the navigation bar
  })
  it('the public desktop hero reserves the first viewport below the navigation', () => {
    const styles = read('components/blocks/blocks.css')
    expect(styles).toContain('min-height: calc(100svh - 56px)')
    expect(styles).toContain('align-items: center')
    expect(styles).toContain('main > .b-hero { min-height: auto; }')
  })
  it('renders every stored project instead of truncating beyond six', () => {
    const projects = Array.from({ length: 8 }, (_, i) => ({ title: `Project ${i + 1}`, problem: '', solution: 'Built it.', outcome: '', stack: [] }))
    const out = html('creative', { ...SAMPLE_PEOPLE.engineer, projects }, 'index')
    expect(out).toContain('Project 8')
  })
  it('uses initials and an abstract project cover when users have no uploaded images, and shows project stack', () => {
    const projects = SAMPLE_PEOPLE.engineer.projects.map((project) => ({ ...project, stack: ['Go', 'Postgres'] }))
    const out = html('creative', { ...SAMPLE_PEOPLE.engineer, avatar_url: null, projects }, 'showcase')
    expect(out).toContain('class="photo-monogram" aria-hidden="true">AO</span>')
    expect(out).toContain('class="pvisual" aria-hidden="true"')
    expect(out).toContain('aria-label="Tools and technologies used"')
    expect(out).toContain('Go')
    expect(out).not.toContain('Your project image')
  })
  it('falls back to a text-safe role treatment when a name is blank', () => {
    const out = html('creative', { ...SPARSE, name: '', email: '' }, 'proof')
    expect(out).not.toContain('photo-monogram')
    expect(out).not.toContain('>undefined<')
  })
  it('the bio can be shortened to the first paragraph without touching the text', () => {
    const c = { ...SAMPLE_PEOPLE.engineer }
    const full = renderToStaticMarkup(createElement(Look, { template: 'minimal', content: c, layout: { ...defaultLayout('profile'), bio: 'long' } } as never))
    const short = renderToStaticMarkup(createElement(Look, { template: 'minimal', content: c, layout: { ...defaultLayout('profile'), bio: 'short' } } as never))
    expect(full).toContain('unglamorous'); expect(short).not.toContain('unglamorous'); expect(short).toContain('Five years')
    expect(c.about).toContain('unglamorous')
  })
  it('accent and density become CSS variables on the root, nothing else', () => {
    const out = renderToStaticMarkup(createElement(Look, { template: 'creative', content: SAMPLE_PEOPLE.engineer, layout: { v: 1, arrangement: 'proof', accent: 'teal', density: 'airy' } } as never))
    expect(out).toContain('--accent:#0B5F5F'); expect(out).toContain('--fill:#0B6E6E'); expect(out).toMatch(/--sec:\d+px/)
    expect(renderToStaticMarkup(createElement(Look, { template: 'creative', content: SAMPLE_PEOPLE.engineer, layout: defaultLayout('proof') } as never))).not.toContain('--accent:')
  })
  it('a Pro template id draws nothing here (it stays legacy)', () => {
    expect(renderToStaticMarkup(createElement(Look, { template: 'developer', content: SAMPLE_PEOPLE.engineer, layout: defaultLayout('proof') } as never))).toBe('')
  })
  it('the page mode adds a skip link and a sticky bar hook; embedded mode does not', () => {
    const page = renderToStaticMarkup(createElement(Look, { template: 'creative', content: SAMPLE_PEOPLE.engineer, layout: defaultLayout('proof'), page: true } as never))
    const emb = renderToStaticMarkup(createElement(Look, { template: 'creative', content: SAMPLE_PEOPLE.engineer, layout: defaultLayout('proof') } as never))
    expect(page).toContain('class="skip"'); expect(page).toContain('data-page')
    expect(emb).not.toContain('class="skip"'); expect(emb).not.toContain('data-page')
  })
  it('the credit line can be switched off (published portfolios)', () => {
    const out = renderToStaticMarkup(createElement(Look, { template: 'creative', content: SAMPLE_PEOPLE.engineer, layout: defaultLayout('proof'), credit: false } as never))
    expect(out).not.toContain(t('portfolio.builtWith'))
  })
})

describe('design rules, checked mechanically', () => {
  const css = read('components/blocks/blocks.css')
  it('every selector is scoped under .lpb, so nothing can leak into the app', () => {
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('{').slice(0, -1).map((s) => s.split('}').pop()!.trim()).filter((s) => s && !s.startsWith('@'))
    const bad = selectors.filter((s) => s.split(',').some((p) => !p.trim().startsWith('.lpb')))
    expect(bad).toEqual([])
  })
  it('no gradients, no glass (backdrop-filter), no box shadows used as nested cards', () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '') // the header comment names these words; only the rules count
    expect(rules).not.toMatch(/gradient|backdrop-filter|box-shadow/i)
  })
  it('reduced motion and print are handled', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce/); expect(css).toMatch(/@media print/)
  })
  it('theme palettes meet AA for every pair a block can produce', () => {
    for (const theme of THEMES) {
      const block = new RegExp(`\\.lpb\\[data-theme="${theme}"\\] \\{([^}]*)\\}`).exec(css)![1]
      const v = Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]))
      for (const [fg, bg] of [['ink', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['ink', 'band'], ['muted', 'band'], ['accent', 'band'], ['on-fill', 'fill'], ['mark-ink', 'mark'], ['accent', 'tint']] as const) {
        const foreground = fg === 'mark-ink' ? (v[fg] ?? v.ink) : v[fg]
        expect(ratio(foreground, v[bg]), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
  it('every link-like target is at least 44px tall', () => {
    for (const sel of ['.lpb .topbar a', '.lpb .plinks a', '.lpb .slinks a, .lpb .clinks a', '.lpb .b-contact .mail', '.lpb .slist a']) {
      const rule = css.split('\n').find((l) => l.startsWith(sel + ' {'))
      expect(rule, sel).toBeTruthy()
      expect(Number(/min-height:\s*(\d+)px/.exec(rule!)?.[1] ?? 0), sel).toBeGreaterThanOrEqual(44)
    }
  })
  it('two typefaces at most per look (files with the same family share a name)', () => {
    for (const th of THEMES) {
      const src = read(`components/blocks/looks/fonts-${th}.ts`)
      const families = new Set([...src.matchAll(/fonts\/([A-Za-z0-9]+)-latin/g)].map((m) => m[1]))
      expect(families.size, th).toBeLessThanOrEqual(2)
      expect(src).not.toMatch(/Inter|Arial,|Roboto/)
    }
  })
  it('fonts are self-hosted (no third-party request) and every theme names unique font families', () => {
    for (const th of THEMES) expect(read(`components/blocks/looks/fonts-${th}.ts`)).not.toMatch(/https?:\/\/|next\/font\/google/)
    const names = THEMES.flatMap((th) => [...read(`components/blocks/looks/fonts-${th}.ts`).matchAll(/const (\w+) = localFont/g)].map((m) => m[1]))
    expect(new Set(names).size).toBe(names.length)
  })
  it('no words are hard-coded in the block components: every visible string comes from messages/en.json', () => {
    for (const f of ['components/blocks/blocks.tsx', 'components/blocks/BlockPortfolio.tsx', 'components/blocks/Look.tsx', 'components/blocks/looks/Studio.tsx', 'components/blocks/looks/Journal.tsx', 'components/blocks/looks/Ledger.tsx']) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      const literal = [...src.matchAll(/>([^<>{}\n]*[A-Za-z]{3,}[^<>{}\n]*)<\/[a-zA-Z]/g)].map((m) => m[1].trim())
      expect(literal, f).toEqual([])
    }
  })
  it('every portfolio.* message the blocks use exists', () => {
    const src = read('components/blocks/blocks.tsx') + read('components/blocks/BlockPortfolio.tsx') + read('lib/blocks/adapt.ts')
    for (const m of src.matchAll(/t\('(portfolio\.[a-zA-Z.]+)'/g)) expect(t(m[1]), m[1]).not.toBe(m[1])
  })
  it('the module is plain (no hooks, no client directive): the public page ships it as HTML', () => {
    for (const f of ['components/blocks/blocks.tsx', 'components/blocks/BlockPortfolio.tsx', 'components/blocks/Look.tsx']) {
      const src = read(f)
      expect(src, f).not.toMatch(/^'use client'|useState|useEffect|useRef|useLayoutEffect/m)
    }
  })
})
