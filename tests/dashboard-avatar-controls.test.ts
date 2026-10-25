import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('dashboard avatar controls', () => {
  it('lets users remove their profile photo from both edit and settings surfaces', () => {
    const src = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
    expect(src).toContain('const handleAvatarDelete = useCallback(async () => {')
    expect(src).toContain("body: JSON.stringify({ content: { avatar_url: null }, expected_edit_count: portfolio.edit_count ?? null })")
    expect((src.match(/Remove photo/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(src).toContain("setAvatarMsg({ type: 'ok', text: 'Photo removed' })")
  })
})
