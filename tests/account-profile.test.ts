// POST /api/account/profile — the server-side replacement for the browser `users` insert. Supabase is faked in memory.
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface Row { id: string; email: string; slug: string; plan?: string; referral_partner?: string; [k: string]: unknown }
const h = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
  token: { user: null as null | { id: string; email: string | null }, error: null as null | Error },
  insertError: null as null | { code: string; message: string },
}))

vi.mock('@/lib/supabase', () => {
  const admin = {
    from: () => {
      let filter: [string, unknown] | null = null
      const q = {
        select: () => q,
        eq: (col: string, val: unknown) => { filter = [col, val]; return q },
        maybeSingle: async () => ({ data: h.rows.find((r) => !filter || r[filter[0]] === filter[1]) ?? null, error: null }),
        insert: async (row: Record<string, unknown>) => {
          h.inserts.push(row)
          if (h.insertError) return { error: h.insertError }
          h.rows.push(row)
          return { error: null }
        },
      }
      return q
    },
  }
  return {
    getSupabaseAdmin: () => admin,
    getSupabaseClient: () => ({ auth: { getUser: async () => ({ data: { user: h.token.user }, error: h.token.error }) } }),
  }
})

import { NextRequest } from 'next/server'
import { POST } from '../app/api/account/profile/route'

let n = 0
const call = (body: unknown, token: string | null = 'tok') =>
  POST(new NextRequest('http://localhost/api/account/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }))

beforeEach(() => {
  h.rows = []; h.inserts = []; h.insertError = null
  n++ // a fresh user id per test so the in-process rate limiter never interferes
  h.token = { user: { id: `u-${n}`, email: `User${n}@Example.com` }, error: null }
})

describe('authentication', () => {
  it('401 without a token, with an invalid token, or when the token has no e-mail', async () => {
    expect((await call({ slug: 'ada-dev' }, null)).status).toBe(401)
    h.token = { user: null, error: new Error('bad jwt') }
    expect((await call({ slug: 'ada-dev' })).status).toBe(401)
    h.token = { user: { id: 'x', email: null }, error: null }
    expect((await call({ slug: 'ada-dev' })).status).toBe(401)
    expect(h.inserts).toHaveLength(0)
  })
})

describe('the server decides every column', () => {
  it('creates the row with plan=unpublished and e-mail from the TOKEN; ignores plan/published_at/email/id in the body', async () => {
    const res = await call({
      slug: 'ada-dev', plan: 'pro', published_at: '2026-01-01', plan_expires_at: '2099-01-01', custom_domain: 'evil.dev',
      email: 'attacker@evil.example', id: 'someone-else',
    })
    expect(res.status).toBe(201)
    expect(h.inserts).toHaveLength(1)
    const row = h.inserts[0]
    expect(row).toEqual({ id: h.token.user!.id, email: h.token.user!.email!.toLowerCase(), slug: 'ada-dev', plan: 'unpublished' })
    expect(Object.keys(row).sort()).toEqual(['email', 'id', 'plan', 'slug'])
  })

  it('accepts a known referral partner and silently drops unknown ones', async () => {
    const ok = await call({ slug: 'ref-one', referral_code: ' Esther ' })
    expect((await ok.json()).referral_applied).toBe(true)
    expect(h.inserts[0].referral_partner).toBe('esther')

    n++; h.token = { user: { id: `u-${n}`, email: `u${n}@example.com` }, error: null }
    const bad = await call({ slug: 'ref-two', referral_code: 'free-money' })
    expect(bad.status).toBe(201)
    expect(h.inserts[1]).not.toHaveProperty('referral_partner')
    for (const evil of [{ a: 1 }, 42, '__proto__', 'constructor', 'toString']) {
      n++; h.token = { user: { id: `u-${n}`, email: `u${n}@example.com` }, error: null }
      await call({ slug: `slug-${n}`, referral_code: evil })
      expect(h.inserts[h.inserts.length - 1]).not.toHaveProperty('referral_partner')
    }
  })
})

describe('slug validation', () => {
  it.each([
    ['too short', 'ab'], ['upper-case is normalised, so this one is fine', 'ADA-Dev'.toUpperCase().replace('ADA', '!!')],
    ['spaces', 'ada dev'], ['leading hyphen', '-ada'], ['trailing hyphen', 'ada-'], ['unicode', 'adä-dev'], ['too long', 'a'.repeat(31)],
    ['not a string', 12345 as unknown as string], ['empty', ''],
  ])('400 invalid_slug: %s', async (_label, slug) => {
    const res = await call({ slug })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_slug')
    expect(h.inserts).toHaveLength(0)
  })

  it.each(['admin', 'api', 'create', 'dashboard', 'preview', 'auth', 'mcp', 'login', 'liveportfolio'])('400 reserved_slug: %s', async (slug) => {
    const res = await call({ slug })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('reserved_slug')
  })

  it('409 slug_taken when another user owns it; no insert', async () => {
    h.rows.push({ id: 'other', email: 'o@example.com', slug: 'taken-one' })
    const res = await call({ slug: 'Taken-One' })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('slug_taken')
    expect(h.inserts).toHaveLength(0)
  })

  it('409 when the unique constraint fires after the pre-check (race), and email_in_use for the e-mail constraint', async () => {
    h.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "users_slug_key"' }
    expect((await (await call({ slug: 'race-one' })).json()).error).toBe('slug_taken')
    n++; h.token = { user: { id: `u-${n}`, email: `u${n}@example.com` }, error: null }
    h.insertError = { code: '23505', message: 'duplicate key value violates unique constraint "users_email_key"' }
    expect((await (await call({ slug: 'race-two' })).json()).error).toBe('email_in_use')
  })

  it('500 (no details leaked) on any other database error', async () => {
    h.insertError = { code: 'XX000', message: 'secret internal detail' }
    const res = await call({ slug: 'boom-one' })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret internal detail')
  })
})

describe('idempotency and abuse', () => {
  it('a retry returns the existing row (created:false) and never inserts or changes the slug', async () => {
    h.rows.push({ id: h.token.user!.id, email: 'x@example.com', slug: 'first-slug', plan: 'pro' })
    const res = await call({ slug: 'different-slug', plan: 'pro' })
    expect(await res.json()).toEqual({ slug: 'first-slug', created: false })
    expect(h.inserts).toHaveLength(0)
  })

  it.each(['null', '[]', '[1,2]', '42', '"str"'])('400 invalid_body for JSON body %s (no 500)', async (raw) => {
    const res = await call(raw)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_body')
    expect(h.inserts).toHaveLength(0)
  })

  it('400 on invalid JSON; 429 after 5 calls in a minute for one user', async () => {
    expect((await call('{not json')).status).toBe(400)
    let last = 0
    for (let i = 0; i < 6; i++) last = (await call({ slug: 'ab' })).status
    expect(last).toBe(429)
  })
})
