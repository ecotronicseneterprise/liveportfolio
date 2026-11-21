// An AI assistant's token (it carries client_id) must be refused on every /api route; a browser sign-in token must not be affected.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { bearerToken, decodeClaims, isAssistantToken } from '@/lib/mcp/token'

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`
const assistant = jwt({ sub: 'u1', aud: 'authenticated', client_id: 'c1' })
const browser = jwt({ sub: 'u1', aud: 'authenticated', role: 'authenticated' })

function apiRoutes(dir: string, base = '/api'): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...apiRoutes(path.join(dir, e.name), `${base}/${e.name.replace(/\[.*\]/, 'x')}`))
    else if (e.name === 'route.ts') out.push(base)
  }
  return out
}
const req = (p: string, token?: string) =>
  new NextRequest(`https://liveportfolio.site${p}`, { headers: token ? { authorization: `Bearer ${token}`, host: 'liveportfolio.site' } : { host: 'liveportfolio.site' } })

describe('token isolation', () => {
  it('classifies tokens', () => {
    expect(isAssistantToken(assistant)).toBe(true)
    expect(isAssistantToken(browser)).toBe(false)
    expect(isAssistantToken('garbage')).toBe(false)
    expect(isAssistantToken(null)).toBe(false)
    expect(decodeClaims(assistant)?.client_id).toBe('c1')
    expect(bearerToken('Bearer abc')).toBe('abc')
    expect(bearerToken('Basic abc')).toBeNull()
  })

  const routes = apiRoutes(path.resolve(__dirname, '..', 'app', 'api'))
  it('finds the api routes', () => expect(routes.length).toBeGreaterThan(15))
  it.each(routes)('refuses an assistant token on %s', async (route) => {
    const res = middleware(req(route, assistant))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('assistant_token_not_allowed')
  })
  it.each(routes)('lets a browser token through on %s', (route) => {
    expect(middleware(req(route, browser)).status).not.toBe(401)
  })
  it('does not touch /mcp or pages', () => {
    expect(middleware(req('/mcp', assistant)).status).not.toBe(401)
    expect(middleware(req('/dashboard', assistant)).status).not.toBe(401)
  })
})
