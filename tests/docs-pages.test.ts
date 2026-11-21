import { describe, expect, it } from 'vitest'
import { DOC_PAGES, DOC_GROUPS } from '@/lib/docs/pages'
import { GET } from '@/app/llms.txt/route'

describe('user docs', () => {
  it('has unique slugs in known groups', () => {
    expect(new Set(DOC_PAGES.map((p) => p.slug)).size).toBe(DOC_PAGES.length)
    for (const p of DOC_PAGES) expect(DOC_GROUPS).toContain(p.group)
  })
  it('states no prices (they live on the home page)', () => {
    expect(JSON.stringify(DOC_PAGES)).not.toMatch(/₦|\$\s?\d|\bUSD\b|\bNGN\b/)
  })
  it('every page is listed in llms.txt', async () => {
    const txt = await GET().text()
    for (const p of DOC_PAGES) expect(txt).toContain(`/docs/${p.slug}`)
  })
  it('covers the assistant pages', () => {
    for (const s of ['connect', 'what-it-can-do', 'example-prompts', 'safety', 'revoke', 'troubleshooting']) expect(DOC_PAGES.map((p) => p.slug)).toContain(s)
  })
})
