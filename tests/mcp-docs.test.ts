import { describe, expect, it } from 'vitest'
import { TOOLS } from '@/lib/mcp/tools'
import { llmsTxt, serverCard, toolsReference } from '@/lib/mcp/docs'

describe('public docs match the tool registry', () => {
  it('documents every tool exactly once', () => {
    expect(toolsReference().map((t) => t.name)).toEqual(TOOLS.map((t) => t.name))
  })
  it('lists every tool in llms.txt and the server card', () => {
    const txt = llmsTxt()
    const card = serverCard()
    for (const t of TOOLS) {
      expect(txt).toContain(t.name)
      expect(card.tools.map((x) => x.name)).toContain(t.name)
    }
    expect(txt).toContain('/docs/mcp')
    expect(card.url).toMatch(/\/mcp$/)
  })
  it('states what the assistant can never do', () => {
    expect(llmsTxt()).toMatch(/Publish or unpublish/)
  })
})
