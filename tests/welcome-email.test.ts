import { beforeEach, describe, expect, it, vi } from 'vitest'
type Row = Record<string, any>
const h = vi.hoisted(() => ({
  user: { id: 'u1', email: 'Ada@Example.com' } as null | Row,
  portfolios: [] as Row[], users: [] as Row[], subs: [] as Row[], sent: [] as Row[], sendOk: true, updates: [] as Row[],
}))
vi.mock('@/lib/email', () => ({ sendEmail: async (m: Row) => { h.sent.push(m); return { success: h.sendOk } } }))
vi.mock('@/lib/supabase', () => {
  const tbl = (name: string) => {
    let filters: Array<(r: Row) => boolean> = []; let upd: Row | null = null
    const q: any = {
      select: () => q, eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q },
      update: (p: Row) => { upd = p; return q },
      maybeSingle: async () => ({ data: (h as any)[name].find((r: Row) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (res: any) => { if (upd) { h.updates.push({ name, upd }); } return Promise.resolve({ error: null }).then(res) },
    }
    return q
  }
  return {
    getSupabaseAdmin: () => ({ from: (n: string) => tbl(n === 'email_subscribers' ? 'subs' : n) }),
    getSupabaseClient: () => ({ auth: { getUser: async () => ({ data: { user: h.user }, error: h.user ? null : new Error('bad') }) } }),
  }
})
import { NextRequest } from 'next/server'
import { POST } from '../app/api/email/welcome/route'
const PID = '11111111-1111-4111-8111-111111111111'
let n = 0
const call = (body: unknown, token: string | null = 't') => POST(new NextRequest('http://x/api/email/welcome', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) }))
beforeEach(() => {
  n++; h.user = { id: `u${n}`, email: 'Ada@Example.com' }
  h.portfolios = [{ id: PID, user_id: h.user.id, content: { name: 'Ada Okonkwo' } }]
  h.users = [{ id: h.user.id, slug: 'ada-dev' }]; h.subs = []; h.sent = []; h.sendOk = true; h.updates = []
})
describe('welcome email', () => {
  it('401 without token / bad token, nothing sent', async () => {
    expect((await call({ portfolioId: PID }, null)).status).toBe(401)
    h.user = null
    expect((await call({ portfolioId: PID })).status).toBe(401)
    expect(h.sent).toHaveLength(0)
  })
  it('sends only to the token e-mail, ignoring email/slug in the body', async () => {
    const res = await call({ portfolioId: PID, email: 'victim@example.com', slug: '<script>x</script>', name: 'x' })
    expect(res.status).toBe(200)
    expect(h.sent).toHaveLength(1)
    expect(h.sent[0].to).toBe('ada@example.com')
    expect(h.sent[0].html).toContain('liveportfolio.site/ada-dev')
    expect(h.sent[0].html).not.toContain('script')
  })
  it('escapes the name', async () => {
    h.portfolios[0].content.name = '<img src=x onerror=alert(1)> Bob'
    await call({ portfolioId: PID })
    expect(h.sent[0].html).not.toContain('<img')
    expect(h.sent[0].html).toContain('&lt;img')
  })
  it('404 for a portfolio that is not the caller’s; 400 for junk ids and bodies', async () => {
    h.portfolios[0].user_id = 'someone-else'
    expect((await call({ portfolioId: PID })).status).toBe(404)
    expect((await call({ portfolioId: 'nope' })).status).toBe(400)
    expect((await call('null')).status).toBe(400)
    expect((await call('[]')).status).toBe(400)
    expect((await call('{oops')).status).toBe(400)
    expect(h.sent).toHaveLength(0)
  })
  it('an invalid stored slug is left out of the mail', async () => {
    h.users[0].slug = '"><b>'
    await call({ portfolioId: PID })
    expect(h.sent[0].html).not.toContain('<b>')
    expect(h.sent[0].html).not.toContain('liveportfolio.site/"')
  })
  it('sends once: second call skipped; persisted flag respected', async () => {
    await call({ portfolioId: PID }); const r2 = await call({ portfolioId: PID })
    expect((await r2.json()).skipped).toBe(true)
    expect(h.sent).toHaveLength(1)
    n++; h.user = { id: `u${n}`, email: 'b@example.com' }
    h.portfolios = [{ id: PID, user_id: h.user.id, content: {} }]; h.users = [{ id: h.user.id, slug: 'bee' }]
    h.subs = [{ id: 's1', email: 'b@example.com', sent_flows: { welcome: true } }]
    expect((await (await call({ portfolioId: PID })).json()).skipped).toBe(true)
    expect(h.sent).toHaveLength(1)
  })
  it('records the flag when a drip row exists; 500 when sending fails', async () => {
    h.subs = [{ id: 's9', email: 'ada@example.com', sent_flows: { a_1: true } }]
    await call({ portfolioId: PID })
    expect(h.updates[0].upd.sent_flows).toEqual({ a_1: true, welcome: true })
    n++; h.user = { id: `u${n}`, email: 'ada@example.com' }; h.portfolios[0].user_id = h.user.id; h.users = [{ id: h.user.id, slug: 'ada-dev' }]; h.subs = []; h.sendOk = false
    expect((await call({ portfolioId: PID })).status).toBe(500)
  })
})
