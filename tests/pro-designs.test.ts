import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProDesign from '../components/templates/pro/ProDesign'
import { PRO_TEMPLATES, ALL_TEMPLATES } from '../lib/plans'
import { proContent as fixture, contentMarkers } from './fixtures/pro-content'
import { proContent } from '../lib/portfolio/pro-content'
import { PRO_SAMPLES } from '../lib/portfolio/pro-samples'
import { withProDesign, isProTemplateId } from '../lib/portfolio/presentation'
import { portfolioRenderMode } from '../lib/portfolio/render-mode'

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
describe.each(PRO_TEMPLATES)('%s redesigned', (template) => {
  const render = (content = fixture) => renderToStaticMarkup(createElement(ProDesign, { content, template }))
  it('renders every profile field and every project link without numeric transformations', () => {
    const html = render()
    for (const marker of contentMarkers) expect(plain(html), marker).toContain(marker)
    for (const link of [fixture.github_url, fixture.linkedin_url, fixture.projects[0].url, fixture.projects[0].github_url]) expect(html).toContain(`href="${link}"`)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain(`data-pro-template="${template}"`)
  })
  it.each(Object.entries(PRO_SAMPLES))('%s: renders safely, with valid anchors', (_name, content) => {
    const html = render(content)
    expect(html).not.toMatch(/href="javascript:|src="javascript:|src="data:|<script>alert|href="mailto:"|href=""/)
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) expect(html).toContain(`id="${id}"`)
  })
  it('does not drop any of 50 projects, jobs, degrees, certifications or testimonials', () => {
    const html = plain(render(PRO_SAMPLES.many))
    for (let i = 1; i <= 50; i++) for (const name of ['Project', 'Company', 'Degree', 'Certificate', 'Author', 'Reference text']) expect(html).toContain(`${name} ${i}`)
  })
  it('the redesign is the default for a Pro template; only an explicit marker of 1 keeps the original; other templates are never affected', () => {
    const byDefault = (id: string) => (isProTemplateId(id) ? 'pro' : 'legacy')
    for (const id of ALL_TEMPLATES) {
      expect(portfolioRenderMode(fixture, id).kind).toBe(byDefault(id))
      expect(portfolioRenderMode(withProDesign(fixture, template, true), id).kind).toBe(byDefault(id))
      // keeping the original affects only this template
      expect(portfolioRenderMode(withProDesign(fixture, template, false), id).kind).toBe(id === template ? 'legacy' : byDefault(id))
    }
    expect(portfolioRenderMode({ ...fixture, pro_designs: { [template]: 999 } }, template).kind).toBe('pro') // an unknown version means the default
  })
})
it('normalization is defensive, complete, immutable and keeps historical education dates', () => {
  const input = { ...fixture, education: [{ degree: 'Degree', institution: 'School', period: '2008–2012' }], projects: [null, { title: 'Malformed but safe', stack: null, url: 'javascript:alert(1)' }], skills: [42, 'SQL'], skills_grouped: [null] }
  const before = JSON.stringify(input)
  const result = proContent(input)
  expect(result.education?.[0].period).toBe('2008–2012')
  expect(result.projects[0].url).toBe('')
  expect(result.skills).toEqual(['SQL'])
  expect(JSON.stringify(input)).toBe(before)
})