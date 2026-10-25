// Does every template work for every kind of person? All 10 templates (and the block-renderer looks the 3 free ones use for new portfolios)
// are rendered with awkward data: a full profile, almost nothing, a chef with no GitHub or LinkedIn, a very long list of projects and
// degrees, and hostile text. Nothing may crash, print "undefined", drop an item, leave an empty link, or let markup through.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useRegion', () => ({ useRegion: () => ({ region: 'NG', loading: false }) }))

import Minimal, { type PortfolioContent } from '../components/templates/Minimal'
import Bold from '../components/templates/Bold'
import Creative from '../components/templates/Creative'
import Developer from '../components/templates/Developer'
import Designer from '../components/templates/Designer'
import DataScientist from '../components/templates/DataScientist'
import ProductManager from '../components/templates/ProductManager'
import Finance from '../components/templates/Finance'
import Graduate from '../components/templates/Graduate'
import Cybersecurity from '../components/templates/Cybersecurity'
import Look from '../components/blocks/Look'
import { ALL_TEMPLATES, FREE_TEMPLATES } from '../lib/plans'
import { safeContent } from '../lib/portfolio/render-safe'

const LEGACY: Record<string, React.ComponentType<{ content: PortfolioContent }>> = {
  minimal: Minimal, bold: Bold, creative: Creative, developer: Developer, designer: Designer, 'data-scientist': DataScientist,
  'product-manager': ProductManager, finance: Finance, graduate: Graduate, cybersecurity: Cybersecurity,
}

const base = (over: Record<string, unknown>): PortfolioContent => ({
  name: 'Test Person', role: 'Role', headline: '', about: '', location: '', email: 'test@example.com',
  skills: [], skills_narrative: '', skills_grouped: [], projects: [], experience: [], ...over,
} as PortfolioContent)

const project = (i: number, extra: Record<string, unknown> = {}) => ({ title: `Project number ${i}`, problem: `Problem ${i}`, solution: `Solution ${i}`, outcome: `Outcome ${i} improved by ${i * 3}%`, stack: ['Go', 'SQL'], ...extra })
const degree = (i: number) => ({ degree: `Degree ${i}`, institution: `Institution ${i}`, period: `20${10 + i}` })

const DATA: Record<string, PortfolioContent> = {
  full: base({
    name: 'Ada Okonkwo', role: 'Backend engineer', headline: 'I build payment systems that stay up.', about: 'Five years in Go and Postgres.\n\nI like reliability.',
    location: 'Lagos', github_url: 'https://github.com/ada', linkedin_url: 'https://linkedin.com/in/ada', skills: ['Go', 'Postgres', 'Redis'],
    skills_grouped: [{ category: 'Languages', items: ['Go', 'Python'] }], projects: [project(1, { url: 'https://example.com/p1' }), project(2), project(3)],
    experience: [{ company: 'Acme', role: 'Engineer', period: '2022 to now', bullets: ['Led a migration', 'Cut latency 40%'] }], education: [degree(1)], certifications: ['AWS Certified'],
  }),
  sparse: base({ name: 'Chidi Eze', role: '', email: 'chidi@example.com' }),
  chef: base({
    name: 'Funke Adebayo', role: 'Head chef', headline: 'I cook West African food for 200 covers a night.', about: 'Fifteen years in professional kitchens.',
    location: 'Abuja', skills: ['Menu design', 'Kitchen management', 'Food safety'], projects: [{ title: 'Pop-up supper club', problem: '', solution: 'Ran a monthly 40-seat dinner.', outcome: 'Sold out 9 months in a row.', stack: [] }],
    experience: [{ company: 'Transcorp Hilton', role: 'Sous chef', period: '2015 to 2021', bullets: ['Ran the pass at breakfast and dinner'] }], education: [{ degree: 'Diploma in Culinary Arts', institution: 'Le Cordon Bleu', period: '2012' }],
  }),
  many: base({
    name: 'Many Things', role: 'Consultant', headline: 'I have done a lot.', about: 'A long career.', location: 'Accra',
    skills: Array.from({ length: 25 }, (_, i) => `Skill ${i}`), skills_grouped: [{ category: 'All', items: Array.from({ length: 25 }, (_, i) => `Skill ${i}`) }],
    projects: Array.from({ length: 12 }, (_, i) => project(i + 1)),
    experience: Array.from({ length: 9 }, (_, i) => ({ company: `Company ${i + 1}`, role: `Role ${i + 1}`, period: `20${10 + i}`, bullets: [`Did thing ${i + 1}`] })),
    education: Array.from({ length: 8 }, (_, i) => degree(i + 1)), certifications: Array.from({ length: 7 }, (_, i) => `Certificate ${i + 1}`),
  }),
  hostile: base({
    name: 'Eve <script>alert(1)</script>', role: '"><img src=x onerror=alert(1)>', headline: 'x'.repeat(400), about: '<b>bold</b> & more\n\n' + 'y'.repeat(900),
    location: "L'agos", skills: ['<i>skill</i>', 'a'.repeat(120)], projects: [project(1, { title: '<script>alert(2)</script>', url: 'javascript:alert(3)' })],
    github_url: 'javascript:alert(4)',
  }),
}

const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')

function renderEach(id: string, content: PortfolioContent): string[] {
  const out: string[] = []
  out.push(renderToStaticMarkup(createElement(LEGACY[id], { content })))
  if ((FREE_TEMPLATES as readonly string[]).includes(id)) {
    for (const arrangement of ['proof', 'profile', 'index', 'showcase'] as const) {
      out.push(renderToStaticMarkup(createElement(Look, { template: id as 'minimal' | 'bold' | 'creative', content, layout: { v: 1, arrangement }, page: true })))
    }
  }
  return out
}

describe('there are exactly the templates we say there are', () => {
  it('3 free and 7 Pro, each with a component', () => {
    expect(ALL_TEMPLATES).toHaveLength(10)
    expect(FREE_TEMPLATES).toHaveLength(3)
    for (const id of ALL_TEMPLATES) expect(LEGACY[id], id).toBeTruthy()
  })
})

describe.each(ALL_TEMPLATES)('%s works for every kind of person', (id) => {
  for (const [kind, content] of Object.entries(DATA)) {
    it(`${kind}: renders, prints no placeholder text and leaves no empty link`, () => {
      for (const html of renderEach(id, content)) {
        expect(html.length).toBeGreaterThan(200)
        const text = visible(html)
        expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/)
        expect(html).not.toMatch(/href=""|href="undefined"|href="null"|mailto:undefined|src="undefined"/)
      }
    })
  }

  it('hostile text is escaped and a javascript: link never becomes a link (the public page draws safeContent())', () => {
    for (const html of renderEach(id, safeContent(DATA.hostile as unknown as Record<string, unknown>) as unknown as PortfolioContent)) {
      expect(html).not.toContain('<script>alert')
      expect(html).not.toMatch(/<img[^>]*onerror/i)
      expect(html).not.toMatch(/href="javascript:/i)
    }
  })

  it('a chef with no GitHub, LinkedIn or photo is not shown a GitHub or LinkedIn link', () => {
    for (const html of renderEach(id, DATA.chef)) {
      expect(html).not.toMatch(/href="https?:\/\/(www\.)?(github|linkedin)\.com/i)
      expect(visible(html)).toContain('Funke Adebayo')
    }
  })

  it('nothing is dropped: every project, role, degree and certificate of a long profile is on the page', () => {
    for (const html of renderEach(id, DATA.many)) {
      const text = visible(html)
      for (let i = 1; i <= 12; i++) expect(text, `project ${i}`).toContain(`Project number ${i}`)
      for (let i = 1; i <= 9; i++) expect(text, `company ${i}`).toContain(`Company ${i}`)
    }
  })
})

describe('safeContent', () => {
  it('drops anything that is not a plain http(s) link, keeps the rest, and does not change its input', () => {
    const input = { name: 'A', github_url: 'javascript:alert(1)', linkedin_url: 'https://linkedin.com/in/a', projects: [{ title: 'P', url: 'data:text/html,x', github_url: 'https://github.com/a/b' }], education: [{ degree: 'D', url: 'ftp://x' }] }
    const copy = JSON.stringify(input)
    const out = safeContent(input) as typeof input & { education: Array<{ url?: string }> }
    expect(out.github_url).toBeUndefined()
    expect(out.linkedin_url).toBe('https://linkedin.com/in/a')
    expect(out.projects[0].url).toBeUndefined(); expect(out.projects[0].github_url).toBe('https://github.com/a/b')
    expect(out.education[0].url).toBeUndefined()
    expect(JSON.stringify(input)).toBe(copy)
  })
})
