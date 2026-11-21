import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { mcpAccess } from '@/lib/mcp/access'
import { TOOLS, toolListing } from '@/lib/mcp/tools'
import { handleMessage, SUPPORTED_VERSIONS } from '@/lib/mcp/rpc'
import { POST, GET } from '@/app/mcp/route'
import { GET as meta } from '@/app/.well-known/oauth-protected-resource/route'
import type { McpCtx } from '@/lib/mcp/auth'

const ctx = (over: Partial<McpCtx['connection']> = {}): McpCtx => ({ userId: 'u1', email: 'a@b.c', plan: 'pro', connection: { id: 'c1', client_id: 'x', client_name: 'Test', allow_edits: true, share_contact: false, ...over } })
const browserJwt = `h.${Buffer.from(JSON.stringify({ sub: 'u1' })).toString('base64url')}.s`
const post = (headers: Record<string, string> = {}, body: unknown = { jsonrpc: '2.0', id: 1, method: 'ping' }) =>
  POST(new NextRequest('https://liveportfolio.site/mcp', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }))

describe('access policy', () => {
  it('is off unless enabled', () => expect(mcpAccess({}, 'a@b.c', 'pro')).toBe('disabled'))
  it('allow-list wins while testing', () => {
    expect(mcpAccess({ MCP_ENABLED: 'true', MCP_ALLOWED_EMAILS: 'a@b.c, X@y.z' }, 'a@b.c', 'free')).toBe('ok')
    expect(mcpAccess({ MCP_ENABLED: 'true', MCP_ALLOWED_EMAILS: 'a@b.c' }, 'other@b.c', 'pro')).toBe('not_allowed')
  })
  it('needs Pro once the allow-list is empty', () => {
    expect(mcpAccess({ MCP_ENABLED: 'true' }, 'a@b.c', 'basic')).toBe('needs_pro')
    expect(mcpAccess({ MCP_ENABLED: 'true' }, 'a@b.c', 'pro')).toBe('ok')
  })
})

describe('tool registry', () => {
  it('has unique, short, snake_case names', () => {
    const names = TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n).toMatch(/^portfolio_[a-z_]+$/)
    for (const n of names) expect(n.length).toBeLessThanOrEqual(64)
  })
  it('documents every tool and sets honest annotations', () => {
    for (const t of TOOLS) {
      expect(t.title.length).toBeGreaterThan(3)
      expect(t.description.length).toBeGreaterThan(60)
      expect(t.description).toMatch(/^Use this/)
      expect(t.annotations.openWorldHint).toBe(t.name === 'portfolio_set_image_from_url')
      if (t.kind === 'read') expect(t.annotations.readOnlyHint).toBe(true)
      else expect(t.annotations.readOnlyHint).toBe(false)
    }
  })
  it('never mentions prices, plans or upgrading (ChatGPT plugin rule)', () => {
    const all = JSON.stringify(toolListing())
    expect(all).not.toMatch(/\b(price|pricing|upgrade|subscribe|subscription|checkout|₦|\$\d)/i)
  })
  it('has no tool for publishing, address, billing, deletion or raw content replacement', () => {
    expect(TOOLS.map((t) => t.name).join(' ')).not.toMatch(/publish|slug|address|plan|pay|billing|delete_account|replace_content|password/)
  })
  it('lists every tool with a JSON Schema', () => {
    const l = toolListing()
    expect(l).toHaveLength(TOOLS.length)
    for (const t of l) expect((t.inputSchema as { type?: string }).type).toBe('object')
  })
})

describe('rpc', () => {
  it('initializes with a supported version and instructions', async () => {
    const r = (await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, ctx())) as { result: { protocolVersion: string; instructions: string } }
    expect(r.result.protocolVersion).toBe('2025-06-18')
    expect(r.result.instructions.length).toBeGreaterThan(100)
    const d = (await handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, ctx())) as { result: { protocolVersion: string } }
    expect(d.result.protocolVersion).toBe(SUPPORTED_VERSIONS[0])
  })
  it('answers notifications with nothing and unknown methods with an error', async () => {
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx())).toBeNull()
    const r = (await handleMessage({ jsonrpc: '2.0', id: 3, method: 'nope' }, ctx())) as { error: { code: number } }
    expect(r.error.code).toBe(-32601)
  })
  it('refuses unknown tools and bad input without touching the database', async () => {
    const u = (await handleMessage({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'portfolio_publish', arguments: {} } }, ctx())) as { error: { code: number } }
    expect(u.error.code).toBe(-32602)
    const bad = (await handleMessage({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'portfolio_update_profile', arguments: { name: 'x'.repeat(500) } } }, ctx())) as { result: { isError: boolean; structuredContent: { error: string } } }
    expect(bad.result.isError).toBe(true)
    expect(bad.result.structuredContent.error).toBe('invalid_input')
  })
  it('a read-only connection cannot write', async () => {
    for (const name of ['portfolio_update_profile', 'portfolio_add_project', 'portfolio_undo', 'portfolio_remove_project']) {
      const args = name === 'portfolio_add_project' ? { title: 'T' } : name === 'portfolio_remove_project' ? { index: 0 } : name === 'portfolio_update_profile' ? { headline: 'h' } : {}
      const r = (await handleMessage({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name, arguments: args } }, ctx({ allow_edits: false }))) as { result: { isError: boolean; structuredContent: { error: string } } }
      expect(r.result.structuredContent.error).toBe('read_only')
    }
  })
  it('rejects replace_content in batches', async () => {
    const r = (await handleMessage({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'portfolio_preview_changes', arguments: { operations: [{ op: 'replace_content', content: {} }] } } }, ctx())) as { result: { structuredContent: { error: string } } }
    expect(r.result.structuredContent.error).toBe('invalid_op')
  })
})

describe('/mcp route', () => {
  it('401 with the discovery header when no token', async () => {
    const res = await post()
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource')
  })
  it('refuses an ordinary browser token', async () => {
    const res = await post({ authorization: `Bearer ${browserJwt}` })
    expect(res.status).toBe(401)
    expect((await res.json()).error.data.code).toBe('invalid_token')
  })
  it('refuses a foreign Origin and does not stream', async () => {
    const res = await post({ origin: 'https://evil.example', authorization: `Bearer ${browserJwt}` })
    expect(res.status).toBe(403)
    expect((await GET()).status).toBe(405)
  })
  it('publishes protected-resource metadata', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ref.supabase.co'
    const j = await (await meta()).json()
    expect(j.resource).toMatch(/\/mcp$/)
    expect(j.authorization_servers[0]).toBe('https://ref.supabase.co/auth/v1')
  })
})
