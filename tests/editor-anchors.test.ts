// Every place the My Portfolio checklist can send someone must exist in the editor, or the button lands at the top instead of the field.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { portfolioIntelligence } from '../lib/dashboard/intelligence'

const page = fs.readFileSync(path.resolve(__dirname, '../app/dashboard/page.tsx'), 'utf8')
// an id in the page is either literal ("editor-about"), a template (`editor-project-${i}-title`) or built from the field key (`editor-${key}`)
const has = (id: string) => {
  const m = id.match(/^editor-(project|experience|education)-(\d+)-(\w+)$/)
  if (m) return page.includes(`editor-${m[1]}-\${i}-${m[3]}`)
  return page.includes(`"${id}"`) || page.includes(`'${id}'`) || (page.includes('id={`editor-${key}`}') && /^editor-(name|role|headline|location|email)$/.test(id))
}

describe('editor anchors', () => {
  const empty = portfolioIntelligence({}).improvements
  const partial = portfolioIntelligence({
    name: 'A', role: 'B', headline: 'C', email: 'a@b.co', location: 'L', about: 'x', avatar_url: 'u', skills: ['a'],
    projects: [{ title: 'T', problem: '', solution: '', outcome: '', stack: [] }],
    experience: [{ company: 'C', role: 'R', period: '', bullets: [] }],
    education: [{ institution: 'I', degree: 'D', year: '', grade: '' }],
  } as never).improvements
  const targets = [...new Set([...empty, ...partial].map((i) => i.action.targetId))]

  it('collects a useful set of targets', () => expect(targets.length).toBeGreaterThan(8))
  for (const id of targets) {
    if (/^editor-(project|experience)-0-/.test(id) && empty.some((i) => i.action.targetId === id && i.action.create)) continue // created on demand
    it(`${id} exists in the editor`, () => expect(has(id), id).toBe(true))
  }
  it('the first project and position are created on demand when there are none', () => {
    expect(page).toContain("targetId.startsWith('editor-project-0')")
    expect(page).toContain("targetId.startsWith('editor-experience-0')")
  })
})
