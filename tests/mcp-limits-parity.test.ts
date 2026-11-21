// The assistant must never be able to save something the dashboard editor cannot take or the page cannot show.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { applyOps } from '@/lib/portfolio/ops'
import Look from '../components/blocks/Look'
import { SAMPLE_PEOPLE } from '../lib/blocks/sample'
import { vendorHome } from '@/lib/mcp/verify'

const LONG = 'word '.repeat(300).trim() // 1,499 characters
const THIRTY = Array.from({ length: 30 }, (_, i) => `Skill ${i + 1}`)

describe('dashboard path takes what the assistant can save', () => {
  it('a 1,500-character project and 30 skills pass the dashboard save (replace_content) as well as the typed operations', () => {
    const state = { content: { name: 'Ada', projects: [], skills: [] }, template: 'minimal' }
    const dash = applyOps(state, [{ op: 'replace_content', content: { projects: [{ title: 'P', problem: LONG, solution: LONG, outcome: LONG, stack: ['a'] }], skills: THIRTY } }])
    expect((dash.state.content.projects as Array<{ solution: string }>)[0].solution.length).toBeGreaterThan(1400)
    expect(dash.state.content.skills).toHaveLength(30)
    const typed = applyOps(state, [{ op: 'add_project', project: { title: 'P', problem: LONG, solution: LONG, outcome: LONG } }, { op: 'set_skills', skills: THIRTY }])
    expect(typed.state.content.skills).toHaveLength(30)
  })
  it('the public page renders them without breaking (free layouts, long text, 30 skills)', () => {
    const base = SAMPLE_PEOPLE.engineer as unknown as Record<string, unknown>
    const content = { ...base, skills: THIRTY, skills_grouped: [], projects: [{ title: 'P', problem: LONG, solution: LONG, outcome: LONG, stack: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }] }
    for (const arrangement of ['proof', 'profile', 'index', 'showcase']) {
      const html = renderToStaticMarkup(createElement(Look, { template: 'minimal', content: content as never, layout: { v: 1, arrangement } as never, page: true }))
      expect(html.length).toBeGreaterThan(500)
      expect(html).toContain('Skill 30')
    }
  })
})

describe('Open Claude / Open ChatGPT button', () => {
  it('only for the verified hosts, decided by host (never by name)', () => {
    expect(vendorHome('claude.ai')).toEqual({ label: 'Open Claude', url: 'https://claude.ai' })
    expect(vendorHome('chatgpt.com')?.label).toBe('Open ChatGPT')
    expect(vendorHome('claude.ai.evil.example')).toBeNull()
    expect(vendorHome('evil.example')).toBeNull()
    expect(vendorHome(null)).toBeNull()
    expect(vendorHome('')).toBeNull()
  })
})
