import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { initialOf, tidyName } from '../lib/onboarding/name'
import { draftFromImport } from '../lib/onboarding/draft'

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8')

describe('tidyName: a name in capitals is shown in normal case, anything else is left alone', () => {
  it.each([
    ['CHUKWUMA CLIFFORD NWANNA', 'Chukwuma Clifford Nwanna'],
    ['ADA OKONKWO', 'Ada Okonkwo'],
    ["MARY-JANE O'BRIEN", "Mary-Jane O'Brien"],
    ['JEAN-LUC PICARD', 'Jean-Luc Picard'],
    ['  ADA  ', 'Ada'],
    ['ÉLODIE ÖZTÜRK', 'Élodie Öztürk'],
    ['ADA', 'Ada'],
  ])('%j → %j', (input, out) => expect(tidyName(input)).toBe(out))

  it.each([
    'Ada Okonkwo', 'Chukwuma Clifford Nwanna', 'Ada McDonald', 'Ludwig van der Berg', "Mary O'Brien", 'ada okonkwo', 'iPhone Ada',
  ])('leaves %j exactly as written', (input) => expect(tidyName(input)).toBe(input))

  it('handles empty and missing values', () => {
    expect(tidyName('')).toBe('')
    expect(tidyName('   ')).toBe('')
    expect(tidyName(null)).toBe('')
    expect(tidyName(undefined)).toBe('')
    expect(tidyName('1234')).toBe('1234') // no letters: nothing to change
  })
})

describe('initialOf: the avatar letter comes from the NAME, the e-mail only when there is no name', () => {
  it('uses the name (the bug: it used the first letter of the e-mail)', () => {
    expect(initialOf('Okonkwo Ada', 'wisereid@example.com')).toBe('O')
    expect(initialOf('ada okonkwo', 'wisereid@example.com')).toBe('A')
    expect(initialOf('  Élodie', 'x@y.co')).toBe('É')
  })
  it('falls back to the e-mail, then to a question mark', () => {
    expect(initialOf('', 'wisereid@example.com')).toBe('W')
    expect(initialOf(undefined, 'wisereid@example.com')).toBe('W')
    expect(initialOf('', '')).toBe('?')
  })
})

describe('import', () => {
  it('a CV name in capitals starts in normal case in the review draft; a normal name is untouched', () => {
    expect(draftFromImport({ name: 'CHUKWUMA CLIFFORD NWANNA' }).name).toBe('Chukwuma Clifford Nwanna')
    expect(draftFromImport({ name: 'Ada McDonald' }).name).toBe('Ada McDonald')
  })
  it('keeps the name already in the draft when the import has none', () => {
    const prev = draftFromImport({ name: 'Ada Okonkwo' })
    expect(draftFromImport({ role: 'Engineer' }, prev).name).toBe('Ada Okonkwo')
  })
})

describe('dashboard header', () => {
  const src = read('app/dashboard/page.tsx')
  it('no avatar uses the e-mail initial any more', () => {
    expect(src).not.toMatch(/user\.email\[0\]/)
    expect(src.match(/initialOf\(/g)?.length).toBeGreaterThanOrEqual(2)
  })
  it('the name is shown through tidyName (display only)', () => {
    expect(src).toMatch(/tidyName\(\(editContent as Record<string, string>\)\.name\)/)
  })
  it('an unpublished address says it is reserved, not live', () => {
    expect(src).toMatch(/Reserved for you, not live yet/)
  })
  it('My Portfolio leaves only Refresh in the header action row; other tabs retain plan and live/publish controls', () => {
    expect(src).toMatch(/activeTab !== 'overview' && \(\s*<span[^>]*\s*style=\{\{ background: planBadge\.bg, color: planBadge\.text \}\}>\s*\{planBadge\.label\}/)
    expect(src).toContain("{activeTab !== 'overview' && (isPublished ? (")
    expect(src).toMatch(/<button\s+onClick=\{\(\) => loadData\(\)\}\s+title="Reload your dashboard data"/)
  })
  it('the reload control has a visible name instead of a bare arrow', () => {
    expect(src).not.toMatch(/^\s*↻\s*$/m)
    expect(src).toMatch(/title="Reload your dashboard data"/)
    expect(src).toMatch(/^\s*Refresh\s*$/m)
  })
})
