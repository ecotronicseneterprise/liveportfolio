// The "portfolio for <profession>" landing pages: every page is complete, unique and follows the brand rules.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROLE_PAGES, ROLE_SLUGS, roleBySlug } from '../lib/seo/roles'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n')
const all = (r: (typeof ROLE_PAGES)[number]) => [r.title, r.description, r.h1, r.intro, ...r.show, ...r.ideas, ...r.headlines, ...r.mistakes, ...r.faq.flatMap((f) => [f.q, f.a])].join(' \n ')

describe('role pages: content', () => {
  it('has a dozen pages with clean, unique URL slugs', () => {
    expect(ROLE_PAGES.length).toBeGreaterThanOrEqual(12)
    expect(new Set(ROLE_SLUGS).size).toBe(ROLE_SLUGS.length)
    for (const s of ROLE_SLUGS) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(roleBySlug('software-developers')?.plural).toBe('software developers')
    expect(roleBySlug('not-a-role')).toBeUndefined()
  })

  for (const r of ROLE_PAGES) {
    describe(r.slug, () => {
      it('is complete', () => {
        expect(Object.keys(SAMPLE_PEOPLE)).toContain(r.kind)
        expect(r.show.length).toBeGreaterThanOrEqual(5)
        expect(r.ideas).toHaveLength(3)
        expect(r.headlines).toHaveLength(3)
        expect(r.mistakes).toHaveLength(3)
        expect(r.faq.length).toBeGreaterThanOrEqual(3)
        expect(r.intro.length).toBeGreaterThan(120)
      })
      it('fits search results: title and description lengths', () => {
        expect(r.title.length).toBeLessThanOrEqual(70)
        expect(r.title).toContain('LivePortfolio')
        expect(r.description.length).toBeGreaterThanOrEqual(80)
        expect(r.description.length).toBeLessThanOrEqual(160)
        expect(r.h1.toLowerCase()).toContain(r.plural.split(' ')[0].toLowerCase())
      })
      it('follows the brand rules: no banned words, no invented statistics, no outcome promises', () => {
        const text = all(r)
        for (const banned of ['passionate', 'results-driven', 'highly motivated', 'cutting-edge', 'spearheaded', 'synergy', 'team player', 'go-getter', 'self-starter', 'AI portfolio builder', 'website builder', 'portfolio generator']) {
          expect(text.toLowerCase(), banned).not.toContain(banned.toLowerCase())
        }
        expect(text).not.toMatch(/\b\d{2,3}%/) // no percentages
        expect(text).not.toMatch(/guarantee[sd]? (you|a job|an interview)|will get you hired|get hired (fast|guaranteed)/i)
      })
    })
  }

  it('every page is distinct: no repeated titles, descriptions, intros or "what to show" lines', () => {
    for (const pick of [(r: (typeof ROLE_PAGES)[number]) => r.title, (r: (typeof ROLE_PAGES)[number]) => r.description, (r: (typeof ROLE_PAGES)[number]) => r.intro]) {
      const v = ROLE_PAGES.map(pick)
      expect(new Set(v).size).toBe(v.length)
    }
    const lines = ROLE_PAGES.flatMap((r) => r.show)
    expect(new Set(lines).size).toBe(lines.length)
  })
})

describe('role pages: wiring', () => {
  it('only listed roles are built; any other address sends the visitor to the hub, never to an error page', () => {
    const page = read('../app/portfolio-for/[role]/page.tsx')
    expect(page).not.toContain('dynamicParams = false')
    expect(page).toContain('generateStaticParams')
    expect(page).toContain("redirect('/portfolio-for')")
    expect(page).not.toContain('notFound')
  })
  it('each page has a canonical address, structured data and a tagged create link', () => {
    const page = read('../app/portfolio-for/[role]/page.tsx')
    expect(page).toContain('alternates: { canonical: url }')
    expect(page).toContain("'@type': 'FAQPage'")
    expect(page).toContain("'@type': 'BreadcrumbList'")
    expect(page).toContain('utm_source=seo&utm_medium=role-page&utm_campaign=${page.slug}')
    expect(page).toContain('safeJsonLd(')
  })
  it('the hub, every role and the sitemap agree; the route is reserved so it is never read as a portfolio name', () => {
    const sitemap = read('../app/sitemap.ts')
    expect(sitemap).toContain('/portfolio-for`')
    expect(sitemap).toContain('ROLE_PAGES.map')
    expect(read('../middleware.ts')).toContain("'portfolio-for'")
    expect(read('../app/portfolio-for/page.tsx')).toContain('ROLE_PAGES.map')
    expect(read('../app/page.tsx')).toContain('href="/portfolio-for"')
  })
})
