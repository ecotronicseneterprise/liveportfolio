import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Developer from '../components/templates/Developer'
import Designer from '../components/templates/Designer'
import DataScientist from '../components/templates/DataScientist'
import ProductManager from '../components/templates/ProductManager'
import Finance from '../components/templates/Finance'
import Graduate from '../components/templates/Graduate'
import Cybersecurity from '../components/templates/Cybersecurity'
import { contentMarkers, proContent } from './fixtures/pro-content'
import type { PortfolioContent } from '../components/templates/Minimal'

const templates = { Developer, Designer, DataScientist, ProductManager, Finance, Graduate, Cybersecurity }
const render = (Template: typeof Developer, content = proContent) => renderToStaticMarkup(createElement(Template, { content }))
const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

describe.each(Object.entries(templates))('%s preserves the person, not just their titles', (_name, Template) => {
  it('renders every supported profile field and both project links', () => {
    const html = render(Template)
    for (const marker of contentMarkers) expect(text(html), marker).toContain(marker)
    for (const link of [proContent.github_url, proContent.linkedin_url, proContent.projects[0].url, proContent.projects[0].github_url]) {
      expect(html).toContain(`href="${link}"`)
    }
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
  })
  it('does not invent a process, job availability or certification from skills', () => {
    const html = render(Template, { ...proContent, certifications: [], skills_grouped: [] })
    expect(text(html)).not.toMatch(/actively looking|Available for security consulting|Research.*Design.*Deliver/i)
    expect(html).not.toMatch(/>Certifications<|class="cy-cert-badge"/)
  })
  it('renders a supplied project image as well as the written evidence', () => {
    const html = render(Template, { ...proContent, projects: [{ ...proContent.projects[0], image_url: 'https://example.com/fixture.svg' }] })
    expect(html).toContain('alt="Project evidence marker"')
    expect(text(html)).toContain('Problem evidence marker')
  })
  it('keeps a university job even when education contains that university', () => {
    expect(text(render(Template))).toContain('Employment role marker')
    expect(text(render(Template))).toContain('Employment bullet marker')
  })
  it('renders historical education dates and repository-only projects', () => {
    const content = { ...proContent, education: [{ degree: 'Historical degree', institution: 'College', period: '2011–2015' }],
      projects: [{ ...proContent.projects[0], url: undefined }] } as unknown as PortfolioContent
    const html = render(Template, content)
    expect(text(html)).toContain('2011–2015')
    expect(html).toContain('href="https://github.com/example/repository"')
  })
  it('has no dead section anchors or empty contact links on an almost-empty profile', () => {
    const html = render(Template, { name: 'Sparse Person', role: '', headline: '', about: '', email: '', location: '', skills: [], skills_narrative: '', skills_grouped: [], projects: [], experience: [] })
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) expect(html, `missing ${id}`).toContain(`id="${id}"`)
    expect(html).not.toMatch(/href="(?:mailto:|)"/)
  })
})