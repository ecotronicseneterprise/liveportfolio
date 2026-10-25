// The owner's dashboard: only the owner gets in, the numbers add up, and links can be created and switched off from it.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string; verified: boolean },
}))

vi.mock('@supabase/supabase-js', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx ??= createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], bootcamp_codes: ['code'] })
  return { createClient: () => h.ctx!.admin }
})
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  const c = (h.ctx ??= createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], bootcamp_codes: ['code'] }))
  const auth = { getUser: async () => (h.user ? { data: { user: { id: h.user.id, email: h.user.email, email_confirmed_at: h.user.verified ? '2026-01-01' : null } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => c.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { GET as overviewGET } from '../app/api/admin/overview/route'
import { GET as bootcampsGET, POST as bootcampsPOST } from '../app/api/admin/bootcamps/route'
import { adminEmails, isAdminEmail } from '../lib/admin/auth'

type Row = Record<string, any>
const rows = (t: string): Row[] => h.ctx!.db[t]
const DAY = 86_400_000
const iso = (t: number) => new Date(t).toISOString()
const req = (url: string, headers: Record<string, string> = {}, init: { method?: string; body?: string } = {}) => new NextRequest(`http://localhost${url}`, { headers: { authorization: 'Bearer t', ...headers }, ...init })

beforeEach(() => {
  for (const k of ['users', 'payments', 'portfolios', 'bootcamp_codes', 'subscriptions', 'payment_intents']) h.ctx!.db[k] = []
  h.ctx!.failures.length = 0
  process.env.PAYSTACK_TEST_EMAIL = 'owner@example.com'
  delete process.env.ADMIN_EMAILS
  process.env.CRON_SECRET = 'ops-secret-value'
  h.user = { id: 'owner-id', email: 'owner@example.com', verified: true }
})

describe('who counts as the owner', () => {
  it('uses ADMIN_EMAILS when set (several allowed, any case), otherwise the owner test e-mail', () => {
    expect(adminEmails({ PAYSTACK_TEST_EMAIL: 'Owner@Example.com' } as unknown as NodeJS.ProcessEnv)).toEqual(['owner@example.com'])
    expect(adminEmails({ ADMIN_EMAILS: 'a@x.com, B@x.com', PAYSTACK_TEST_EMAIL: 'c@x.com' } as unknown as NodeJS.ProcessEnv)).toEqual(['a@x.com', 'b@x.com'])
    expect(isAdminEmail('B@X.com', { ADMIN_EMAILS: 'a@x.com,b@x.com' } as unknown as NodeJS.ProcessEnv)).toBe(true)
    expect(isAdminEmail('', {} as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(isAdminEmail('someone@x.com', {} as unknown as NodeJS.ProcessEnv)).toBe(false)
  })
})

describe('the overview is for the owner only', () => {
  it('refuses a signed-out caller, a different account, and the owner e-mail when it is not verified', async () => {
    h.user = null
    expect((await overviewGET(new NextRequest('http://localhost/api/admin/overview'))).status).toBe(401)
    h.user = { id: 'x', email: 'someone@example.com', verified: true }
    expect((await overviewGET(req('/api/admin/overview'))).status).toBe(401)
    h.user = { id: 'owner-id', email: 'owner@example.com', verified: false }
    expect((await overviewGET(req('/api/admin/overview'))).status).toBe(401)
  })
  it('accepts the operations secret (for scripts) and refuses a wrong one', async () => {
    h.user = null
    expect((await overviewGET(req('/api/admin/overview', { 'x-cron-secret': 'ops-secret-value', authorization: '' }))).status).toBe(200)
    expect((await overviewGET(req('/api/admin/overview', { 'x-cron-secret': 'wrong-secret-val!', authorization: '' }))).status).toBe(401)
  })
  it('there is no shared username and password: admin/admin gets nothing', async () => {
    h.user = null
    const res = await overviewGET(req('/api/admin/overview', { authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64') }))
    expect(res.status).toBe(401)
  })
})

describe('the numbers', () => {
  it('counts people by plan, cohort, sign-ups, revenue after refunds, refund requests and cohort conversion', async () => {
    const now = Date.now()
    rows('users').push(
      { id: 'u1', email: 'a@x.com', slug: 'a', plan: 'unpublished', bootcamp_code: null, created_at: iso(now - 2 * DAY) },
      { id: 'u2', email: 'b@x.com', slug: 'b', plan: 'basic', bootcamp_code: 'uniben', plan_expires_at: iso(now + 10 * DAY), created_at: iso(now - 40 * DAY) },
      { id: 'u3', email: 'c@x.com', slug: 'c', plan: 'pro', bootcamp_code: 'uniben', plan_expires_at: iso(now - DAY), created_at: iso(now - 5 * DAY) },
    )
    rows('portfolios').push({ id: 'p1' }, { id: 'p2' })
    rows('payments').push(
      { id: 'pay1', user_id: 'u3', product_tier: 'pro', amount_cents: 4_500_000, created_at: iso(now - DAY), refunded_at: null, ls_order_id: 'lpi_1' },
      { id: 'pay2', user_id: 'u2', product_tier: 'basic', amount_cents: 1_500_000, created_at: iso(now - 2 * DAY), refunded_at: iso(now), ls_order_id: 'lpi_2' },
    )
    rows('subscriptions').push({ id: 's1', user_id: 'u3', plan: 'pro', status: 'active', created_at: iso(now), expires_at: iso(now + 300 * DAY) })
    rows('bootcamp_codes').push({ code: 'uniben', name: 'UNIBEN', plan_to_grant: 'basic', active: true, max_uses: 100, use_count: 2, created_at: iso(now - 50 * DAY) })
    rows('payment_intents').push({ id: 'i1', user_id: 'u2', tier: 'basic', amount_kobo: 1_500_000, reference: 'lpi_2', status: 'paid', access_code: 'refund_requested', paid_at: iso(now - DAY) })

    const j = await (await overviewGET(req('/api/admin/overview'))).json()
    expect(j.users).toMatchObject({ total: 3, free: 1, basic: 1, pro: 1, cohort: 2, last7: 2, last30: 2 })
    expect(j.portfolios).toBe(2)
    expect(j.payments).toMatchObject({ count: 2, revenue_kobo: 4_500_000, refunded_count: 1 })
    expect(j.signupsByDay).toHaveLength(30)
    expect(j.signupsByDay.reduce((s: number, d: { n: number }) => s + d.n, 0)).toBe(2)
    expect(j.refundRequests).toEqual([expect.objectContaining({ email: 'b@x.com', reference: 'lpi_2' })])
    expect(j.cohorts[0]).toMatchObject({ code: 'uniben', members: 2, converted: 1, ending_soon: 1 })
    expect(j.cohorts[0].link).toMatch(/\/bootcamp\/uniben$/)
  })
  it('one failing section does not blank the page', async () => {
    h.ctx!.failures.push({ table: 'payments', op: 'select', sticky: true })
    const res = await overviewGET(req('/api/admin/overview'))
    expect(res.status).toBe(200)
    expect((await res.json()).payments).toBeNull()
  })
})

describe('creating a link from the dashboard (signed in, no secret)', () => {
  const post = (body: unknown) => bootcampsPOST(req('/api/admin/bootcamps', { 'content-type': 'application/json' }, { method: 'POST', body: JSON.stringify(body) }))
  it('works for the owner and not for anyone else', async () => {
    expect((await post({ code: 'lagos-1', name: 'Lagos Bootcamp' })).status).toBe(200)
    expect(rows('bootcamp_codes').some((c) => c.code === 'lagos-1')).toBe(true)
    h.user = { id: 'x', email: 'someone@example.com', verified: true }
    expect((await post({ code: 'lagos-2', name: 'Other' })).status).toBe(401)
    expect(rows('bootcamp_codes').some((c) => c.code === 'lagos-2')).toBe(false)
    expect((await bootcampsGET(req('/api/admin/bootcamps'))).status).toBe(401)
  })
})
