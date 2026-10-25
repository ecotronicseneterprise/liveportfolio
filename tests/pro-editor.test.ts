import { describe, expect, it } from 'vitest'
import { removeSkill } from '../lib/portfolio/editor'
import { completeSkillGroups } from '../lib/portfolio/pro-content'
import { proContent } from './fixtures/pro-content'

describe('explicit skill removal', () => {
  it('removes all representations without changing other skills or mutating input', () => {
    const content = { ...proContent, skills: ['Python', 'SQL'], skills_grouped: [{ category: 'Languages', items: ['python', 'Group-only skill'] }] }
    const before = JSON.stringify(content)
    const next = removeSkill(content, 'Python')
    expect(next.skills).toEqual(['SQL'])
    expect(next.skills_grouped[0].items).toEqual(['Group-only skill'])
    expect(completeSkillGroups(next).flatMap((g) => g.items)).toEqual(['Group-only skill', 'SQL'])
    expect(JSON.stringify(content)).toBe(before)
  })
  it('also removes a group-only skill, dropping the now empty group', () => {
    const next = removeSkill({ skills: [], skills_grouped: [{ category: 'Tools', items: ['Docker'] }] }, 'Docker')
    expect(next.skills_grouped).toEqual([])
  })
})