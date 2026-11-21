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
  it('Claude and ChatGPT share the same three-step structure; every step has an image slot with alt text', () => {
    expect(CONNECT_CLIENTS.map((c) => c.slug)).toEqual(['claude', 'chatgpt', 'other'])
    const by = (n: string) => CONNECT_CLIENTS.find((c) => c.slug === n)!
    expect(by('claude').steps).toHaveLength(3)
    expect(by('chatgpt').steps).toHaveLength(3)
    expect(by('claude').steps.map((x) => x.title.split(' ')[0])).toEqual(['Open', 'Paste', 'Approve'])
    for (const c of CONNECT_CLIENTS) for (const x of c.steps) { expect(x.image.alt.length).toBeGreaterThan(10); expect(x.image.file).toMatch(/^[a-z0-9-]+.png$/) }
    expect(by('chatgpt').steps[1].fields?.map((f) => f.label)).toEqual(['Name', 'Description', 'Server URL', 'Authentication'])
    expect(by('claude').steps[1].fields?.map((f) => f.value)).toContain('LivePortfolio')
  })
  it('lists them in llms.txt', async () => {
    const txt = await GET().text()
    for (const c of CONNECT_CLIENTS) expect(txt).toContain(`/docs/connect/${c.slug}`)
  })
})

import fs from 'node:fs'
import { FIRST_CHAT_MESSAGE } from '@/lib/docs/sync'
describe('the "use LivePortfolio" instruction comes first', () => {
  it('is the same text on the card, /connect and the guides, and the card keeps server code out of the browser bundle', () => {
    const card = fs.readFileSync('components/dashboard/AssistantCard.tsx', 'utf8')
    expect(card).toContain('components/docs/FirstMessage')
    expect(card).not.toContain("@/lib/docs/connect")
    expect(card).not.toContain('just got certified in')
    expect(fs.readFileSync('app/connect/page.tsx', 'utf8')).toContain('FirstMessage')
    expect(card).toContain('FirstMessage')
    expect(FIRST_CHAT_MESSAGE).toMatch(/^Use the LivePortfolio MCP/)
    expect(FIRST_CHAT_MESSAGE.length).toBeLessThan(500)
    expect(fs.readFileSync('components/docs/ConnectGuide.tsx', 'utf8')).toContain('FirstMessage')
  })
})
