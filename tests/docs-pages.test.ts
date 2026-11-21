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

import { CONNECT_CLIENTS } from '@/lib/docs/connect'
describe('per-assistant connect pages', () => {
  it('has two steps and a screenshot slot for each assistant', () => {
    expect(CONNECT_CLIENTS.map((c) => c.slug)).toEqual(['claude', 'chatgpt', 'other'])
    for (const c of CONNECT_CLIENTS) { expect(c.steps).toHaveLength(2); for (const s of c.steps) expect(s.alt.length).toBeGreaterThan(10) }
  })
  it('lists them in llms.txt', async () => {
    const txt = await GET().text()
    for (const c of CONNECT_CLIENTS) expect(txt).toContain(`/docs/connect/${c.slug}`)
  })
})

import fs from 'node:fs'
import { FIRST_CHAT_MESSAGE, SYNC_INSTRUCTION } from '@/lib/docs/sync'
describe('the "use LivePortfolio" instruction comes first', () => {
  it('is the same text on the card, /connect and the guides, and the card keeps server code out of the browser bundle', () => {
    const card = fs.readFileSync('components/dashboard/AssistantCard.tsx', 'utf8')
    expect(card).toContain("@/lib/docs/sync")
    expect(card).not.toContain("@/lib/docs/connect")
    expect(card).not.toContain('just got certified in')
    expect(fs.readFileSync('app/connect/page.tsx', 'utf8')).toContain('FIRST_CHAT_MESSAGE')
    expect(card).toContain('FIRST_CHAT_MESSAGE')
    expect(FIRST_CHAT_MESSAGE).toMatch(/^Use LivePortfolio/)
    expect(fs.readFileSync('app/docs/connect/[client]/page.tsx', 'utf8')).toContain('FIRST_CHAT_MESSAGE')
    expect(JSON.stringify(DOC_PAGES.find((p) => p.slug === 'connect'))).toContain(SYNC_INSTRUCTION)
  })
})
