import { describe, expect, it } from 'vitest'
import { appendText, approvalReason, auditHealth, chronologicalIndex, dropBullet, insertBullet, moveBullet, replaceSnippet, setBullet, staleCurrentRole, withCertification, withEducation } from '@/lib/mcp/edit-helpers'

describe('certifications and education', () => {
  it('adds one and keeps the rest', () => {
    const r = withCertification(['AZ-900'], 'Microsoft Azure AI Engineer Associate (AI-102)')
    expect(r.ok && r.value).toEqual(['AZ-900', 'Microsoft Azure AI Engineer Associate (AI-102)'])
  })
  it('refuses duplicates ignoring case and punctuation, and a full list', () => {
    expect(withCertification(['AZ-900'], ' az 900 ')).toMatchObject({ ok: false, code: 'duplicate' })
    expect(withCertification(Array.from({ length: 12 }, (_, i) => `c${i}`), 'new')).toMatchObject({ ok: false, code: 'limit' })
    expect(withEducation([{ degree: 'BSc CS', institution: 'UNILAG' }], { degree: 'bsc cs', institution: 'Unilag' })).toMatchObject({ ok: false, code: 'duplicate' })
    expect(withEducation([], { degree: 'MSc', institution: 'X' }).ok).toBe(true)
  })
})

describe('text edits', () => {
  it('appends and prepends without touching existing text', () => {
    expect(appendText('One.', 'Two.', 'end', ' ')).toBe('One. Two.')
    expect(appendText('One.', 'Zero.', 'start', ' ')).toBe('Zero. One.')
    expect(appendText('', 'Only.', 'end', ' ')).toBe('Only.')
  })
  it('snippet replace needs exactly one match', () => {
    expect(replaceSnippet('a teh b', 'teh', 'the')).toEqual({ ok: true, value: 'a the b' })
    expect(replaceSnippet('a b', 'zzz', 'x')).toMatchObject({ ok: false, code: 'not_found' })
    expect(replaceSnippet('aa', 'a', 'x')).toMatchObject({ ok: false, code: 'ambiguous' })
  })
  it('bullet operations', () => {
    expect(insertBullet(['a'], 'b')).toEqual({ ok: true, value: ['a', 'b'] })
    expect(insertBullet(['a'], 'A.')).toMatchObject({ code: 'duplicate' })
    expect(setBullet(['a', 'b'], 1, 'c')).toEqual({ ok: true, value: ['a', 'c'] })
    expect(moveBullet(['a', 'b', 'c'], 0, 2)).toEqual({ ok: true, value: ['b', 'c', 'a'] })
    expect(dropBullet(['a', 'b'], 5)).toMatchObject({ code: 'out_of_range' })
  })
})

describe('career order', () => {
  const have = [{ company: 'B', period: 'Mar 2025 – Present' }, { company: 'A', period: 'Sep 2022 – Feb 2025' }]
  it('puts a new current role first and an old one in order', () => {
    expect(chronologicalIndex(have, 'Jan 2026 - Present')).toBe(0)
    expect(chronologicalIndex(have, '2018 - 2020')).toBe(2)
    expect(chronologicalIndex(have, '2024 - 2025')).toBe(1)
    expect(chronologicalIndex(have, '')).toBe(2)
  })
  it('notices an older role that still says present', () => {
    expect(staleCurrentRole(have, 'Jan 2026 - Present')).toContain('B')
    expect(staleCurrentRole(have, '2018 - 2020')).toBeNull()
  })
})

describe('approval policy for direct edits', () => {
  const before = { about: 'x'.repeat(300), github_url: 'https://github.com/a', projects: [{ title: 'P', url: 'https://p.example' }], skills: ['a', 'b', 'c', 'd', 'e'] }
  it('a new or changed link needs approval, an unchanged or removed one does not', () => {
    expect(approvalReason(before, 'minimal', [{ op: 'set_link', field: 'github_url', value: 'https://evil.example' }])).toMatch(/link/)
    expect(approvalReason(before, 'minimal', [{ op: 'add_project', project: { title: 'Q', url: 'https://q.example' } }])).toMatch(/link/)
    expect(approvalReason(before, 'minimal', [{ op: 'set_link', field: 'github_url', value: '' }])).toBeNull()
    expect(approvalReason(before, 'minimal', [{ op: 'set_field', field: 'headline', value: 'Hello' }])).toBeNull()
  })
  it('a sharp cut needs approval', () => {
    expect(approvalReason(before, 'minimal', [{ op: 'set_field', field: 'about', value: 'Short.' }])).toMatch(/cut the about/)
    expect(approvalReason(before, 'minimal', [{ op: 'set_skills', skills: ['a'] }])).toMatch(/skills/)
    expect(approvalReason(before, 'minimal', [{ op: 'set_field', field: 'about', value: 'y'.repeat(250) }])).toBeNull()
  })
})

describe('health check', () => {
  it('lists real gaps', () => {
    const issues = auditHealth({ about: 'short', projects: [{ title: 'P', outcome: '' }], experience: [{ company: 'C', bullets: [] }] })
    expect(issues.join(' ')).toMatch(/About section is short/)
    expect(issues.join(' ')).toMatch(/No education/)
    expect(issues.join(' ')).toMatch(/Project 1 \(P\) has no outcome/)
    expect(issues.join(' ')).toMatch(/Role 1 \(C\) has no highlights/)
  })
})
