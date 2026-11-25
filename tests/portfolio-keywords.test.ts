// A portfolio page carries the person's own keywords, never LivePortfolio's marketing terms.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveKeywords } from '../lib/portfolio/derive'

describe('deriveKeywords', () => {
  const content = {
    name: 'Clifford Nwanna', role: 'Process Engineer', location: 'Lagos, Nigeria',
    skills_grouped: [{ category: 'Data', items: ['Power BI', 'SQL'] }, { category: 'Plant', items: ['HYSYS', 'sql'] }],
    skills: ['Python', 'Power BI', ''],
  }
  it('is the name, role, place and skills, each once, groups first', () => {
    expect(deriveKeywords(content)).toEqual(['Clifford Nwanna', 'Process Engineer', 'Lagos, Nigeria', 'Power BI', 'SQL', 'HYSYS', 'Python'])
  })
  it('never contains a platform marketing term', () => {
    const all = deriveKeywords(content).join(' ').toLowerCase()
    for (const term of ['portfolio builder', 'hireable online', 'portfolio website', 'liveportfolio', 'african tech professionals']) expect(all).not.toContain(term)
  })
  it('caps at 12, skips overlong and non-text values, and survives empty content', () => {
    const many = { name: 'A', skills: Array.from({ length: 40 }, (_, i) => `Skill ${i}`).concat(['x'.repeat(60)]) }
    expect(deriveKeywords(many)).toHaveLength(12)
    expect(deriveKeywords(many)).not.toContain('x'.repeat(60))
    expect(deriveKeywords({})).toEqual([])
    expect(deriveKeywords({ name: 5, skills: 'nope', skills_grouped: [null, { items: 3 }] } as never)).toEqual([])
  })
  it('the portfolio page sets its own keywords (so the site-wide ones are not inherited)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../app/portfolio/[slug]/page.tsx'), 'utf8')
    expect(src).toMatch(/keywords: portfolio\.content \? deriveKeywords\(portfolio\.content\) : \[\]/)
  })
})