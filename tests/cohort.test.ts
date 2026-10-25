// Cohort access (bootcamp and university links): the link, the redeem route, the countdown, the expiry job and the e-mail sequence.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  emails: [] as Array<{ to: string; subject: string; html: string }>,
  emailOk: true,
}))

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('@/lib/email', () => ({
  sendEmail: async (m: { to: string; subject: string; html: string }) => { if (h.emailOk) h.emails.push(m); return { success: h.emailOk } },
  emailTemplates: {},
}))
vi.mock('@supabase/supabase-js', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx ??= createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], bootcamp_codes: ['code'], email_subscribers: ['email'] })
  return { createClient: () => h.ctx!.admin }
})
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  const c = h.ctx ?? createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], bootcamp_codes: ['code'], email_subscribers: ['email'] })
  h.ctx = c
  const auth = { getUser: async () => (h.user ? { data: { user: { ...h.user, email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => c.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { POST as redeemPOST } from '../app/api/bootcamp/redeem/route'
import { GET as expireGET } from '../app/api/cron/expire-plans/route'
import { GET as dripGET } from '../app/api/cron/drip/route'
import { GET as billingGET } from '../app/api/billing/route'
import { GET as adminGET, POST as adminPOST, PATCH as adminPATCH } from '../app/api/admin/bootcamps/route'
import CohortBanner, { countdownParts } from '../components/dashboard/CohortBanner'
import { COHORT_RULES, DAY_MS, cohortStart, daysLeft, nextCohortStep, type CohortStep } from '../lib/cohort/schedule'
import { renderCohortEmail } from '../lib/email-drip'
import { confirmNext, captureAttribution, readAttribution } from '../lib/onboarding/attribution'
import { PLANS } from '../lib/plans'

const U1 = '11111111-1111-4111-8111-111111111111'
type Row = Record<string, any>
const rows = (t: string): Row[] => h.ctx!.db[t]
const iso = (t: number) => new Date(t).toISOString()
const NOW = Date.UTC(2026, 9, 25, 7, 0, 0)

function sixMonthsAfter(t: number) { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() + 6); return d.getTime() }

beforeEach(() => {
  for (const k of ['users', 'bootcamp_codes', 'subscriptions', 'payments', 'email_subscribers', 'payment_intents', 'portfolios']) h.ctx!.db[k] = []
  h.ctx!.failures.length = 0
  h.emails = []; h.emailOk = true
  h.user = { id: U1, email: 'ada@example.com' }
  process.env.CRON_SECRET = 'secret-cron-value'
  process.env.RESEND_API_KEY = 'x'
  process.env.UNSUBSCRIBE_SECRET = 'u'
  rows('users').push({ id: U1, email: 'ada@example.com', slug: 'ada', plan: 'unpublished', bootcamp_code: null, plan_expires_at: null })
  rows('bootcamp_codes').push({ code: 'uniben-cs', name: 'UNIBEN Computer Science', plan_to_grant: 'basic', active: true, max_uses: null, use_count: 0 })
})

const redeem = (code: unknown = 'uniben-cs') =>
  redeemPOST(new NextRequest('http://localhost/api/bootcamp/redeem', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify({ code }) }))

describe('redeeming a cohort link', () => {
  it('gives 6 months of the plan, publishes, counts the use and sends the welcome e-mail once, straight away', async () => {
    const res = await redeem()
    expect(res.status).toBe(200)
    const u = rows('users')[0]
    expect(u.plan).toBe('basic'); expect(u.bootcamp_code).toBe('uniben-cs'); expect(u.published_at).toBeTruthy()
    const months = (new Date(u.plan_expires_at).getTime() - Date.now()) / DAY_MS
    expect(months).toBeGreaterThan(180); expect(months).toBeLessThan(186)
    expect(rows('bootcamp_codes')[0].use_count).toBe(1)
    expect(h.emails).toHaveLength(1)
    expect(h.emails[0].subject).toMatch(/6 months of free access/)
    expect(h.emails[0].html).toContain('UNIBEN Computer Science')
    expect(rows('email_subscribers')[0].sent_flows).toMatchObject({ d_welcome: true })
  })

  it('is idempotent: a second call changes nothing, counts nothing and sends nothing', async () => {
    await redeem()
    const before = JSON.stringify(rows('users')[0])
    const again = await redeem()
    expect((await again.json()).already_redeemed).toBe(true)
    expect(JSON.stringify(rows('users')[0])).toBe(before)
    expect(rows('bootcamp_codes')[0].use_count).toBe(1)
    expect(h.emails).toHaveLength(1)
  })

  it('never touches someone who already pays (no downgrade, no end date put on a paid plan)', async () => {
    rows('users')[0].plan = 'pro'
    const res = await redeem()
    expect((await res.json()).already_paid).toBe(true)
    expect(rows('users')[0]).toMatchObject({ plan: 'pro', bootcamp_code: null, plan_expires_at: null })
    expect(rows('bootcamp_codes')[0].use_count).toBe(0)
  })

  it('refuses an unknown code, a switched-off link, a full link and a signed-out caller', async () => {
    expect((await redeem('nope')).status).toBe(400)
    rows('bootcamp_codes')[0].active = false
    expect((await redeem()).status).toBe(400)
    rows('bootcamp_codes')[0].active = true; rows('bootcamp_codes')[0].max_uses = 1; rows('bootcamp_codes')[0].use_count = 1
    expect((await redeem()).status).toBe(400)
    h.user = null
    expect((await redeem()).status).toBe(401)
    expect(rows('users')[0].plan).toBe('unpublished')
  })

  it('a failed welcome e-mail never blocks the access (the daily job retries it)', async () => {
    h.emailOk = false
    const res = await redeem()
    expect(res.status).toBe(200)
    expect(rows('users')[0].plan).toBe('basic')
    expect(rows('email_subscribers')[0]?.sent_flows ?? {}).not.toHaveProperty('d_welcome')
  })
})

describe('the countdown the dashboard shows', () => {
  const grant = (daysFromNow: number) => { Object.assign(rows('users')[0], { plan: 'basic', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() + daysFromNow * DAY_MS) }) }
  const billing = async () => (await billingGET(new NextRequest('http://localhost/api/billing', { headers: { authorization: 'Bearer t' } }))).json()

  it('GET /api/billing reports the cohort, its end date and the days left', async () => {
    grant(100)
    const j = await billing()
    expect(j.cohort).toMatchObject({ name: 'UNIBEN Computer Science', active: true })
    expect(j.cohort.days_left).toBeGreaterThanOrEqual(99); expect(j.cohort.days_left).toBeLessThanOrEqual(101)
  })
  it('reports an ended cohort as inactive, so the dashboard can offer to bring the portfolio back', async () => {
    Object.assign(rows('users')[0], { plan: 'unpublished', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() - 2 * DAY_MS) })
    expect((await billing()).cohort).toMatchObject({ active: false, days_left: 0 })
  })
  it('nobody else sees a cohort, and someone who has paid stops seeing one', async () => {
    expect((await billing()).cohort).toBeUndefined()
    grant(100)
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'basic', status: 'active', created_at: iso(Date.now()), expires_at: iso(Date.now() + 300 * DAY_MS) })
    expect((await billing()).cohort).toBeUndefined()
  })
  it('counts days, then hours in the last two days, then ends', () => {
    expect(countdownParts(iso(NOW + 100 * DAY_MS), NOW)).toEqual({ value: 100, unit: 'days' })
    expect(countdownParts(iso(NOW + 3 * 3_600_000), NOW)).toEqual({ value: 3, unit: 'hours' })
    expect(countdownParts(iso(NOW - 1), NOW)).toEqual({ value: 0, unit: 'ended' })
  })
  it('the banner draws nothing until the server says there is a cohort', () => {
    expect(renderToStaticMarkup(createElement(CohortBanner, { token: 't', onKeep: () => {} }))).toBe('')
  })
})

describe('the expiry job and people who convert', () => {
  const run = () => expireGET(new NextRequest('http://localhost/api/cron/expire-plans', { headers: { 'x-cron-secret': 'secret-cron-value' } }))
  it('sets someone back to Free when their free access has ended', async () => {
    Object.assign(rows('users')[0], { plan: 'basic', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() - DAY_MS) })
    await run()
    expect(rows('users')[0].plan).toBe('unpublished')
  })
  it('keeps the plan of someone who paid before the free access ended', async () => {
    Object.assign(rows('users')[0], { plan: 'basic', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() - DAY_MS) })
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'basic', status: 'active', created_at: iso(Date.now() - 20 * DAY_MS), expires_at: iso(Date.now() + 340 * DAY_MS) })
    await run()
    expect(rows('users')[0].plan).toBe('basic')
  })
})

describe('the e-mail schedule', () => {
  const expires = iso(sixMonthsAfter(NOW)) // access started "now"
  const at = (daysAfterStart: number) => NOW + daysAfterStart * DAY_MS

  it('starts the 6 months from when they end', () => {
    expect(cohortStart(expires).getTime()).toBe(NOW)
  })
  it('sends the right step on the right day, and never a step twice', () => {
    const seen: Record<number, CohortStep | null> = {}
    const sent: Record<string, boolean> = {}
    for (const d of [0, 1, 3, 14, 45, 93, 152, 168, 175, 181, 183, 197, 229]) {
      seen[d] = nextCohortStep(expires, sent, at(d))
      if (seen[d]) sent[`d_${seen[d]}`] = true
    }
    expect(seen[0]).toBe('welcome'); expect(seen[1]).toBeNull()
    expect(seen[3]).toBe('share'); expect(seen[14]).toBe('cv'); expect(seen[45]).toBe('fresh')
    expect(seen[93]).toBe('halfway')
    expect(seen[152]).toBe('left30'); expect(seen[168]).toBe('left14'); expect(seen[175]).toBe('left7'); expect(seen[181]).toBe('left1')
    expect(seen[183]).toBe('ended'); expect(seen[197]).toBe('after14'); expect(seen[229]).toBe('after45')
    expect(Object.values(seen).filter(Boolean)).toHaveLength(new Set(Object.values(seen).filter(Boolean)).size)
  })
  it('does not send an old step late: a missed week does not bring back "30 days left" at 5 days left', () => {
    expect(nextCohortStep(expires, { d_welcome: true, d_share: true, d_cv: true, d_fresh: true, d_halfway: true }, at(178))).toBeNull()
  })
  it('daysLeft rounds up and is 0 once over', () => {
    expect(daysLeft(iso(NOW + 3 * 3_600_000), NOW)).toBe(1)
    expect(daysLeft(iso(NOW - 1), NOW)).toBe(0)
  })
  it('every step in the rules has an e-mail', () => {
    for (const r of COHORT_RULES) {
      const m = renderCohortEmail(r.step, { email: 'a@example.com', cohortName: 'UNIBEN', daysLeft: 30, endDate: '25 April 2027', portfolioUrl: 'https://liveportfolio.site/ada' })
      expect(m.subject.length).toBeGreaterThan(5)
      expect(m.html).toContain('Unsubscribe')
    }
  })
})

describe('the e-mail copy is honest', () => {
  const ctx = { email: 'a@example.com', cohortName: 'UNIBEN <b>x</b>', daysLeft: 7, endDate: '25 April 2027', portfolioUrl: 'https://liveportfolio.site/ada' }
  const all = COHORT_RULES.map((r) => renderCohortEmail(r.step, ctx))
  it('quotes the real prices from the plans file and the real terms', () => {
    const last = renderCohortEmail('left7', ctx).html
    expect(last).toContain('₦15,000'); expect(last).toContain('₦45,000')
    expect(PLANS.basic.priceNgn).toBe(15000)
    expect(last).toMatch(/No automatic renewal/); expect(last).toMatch(/7-day refund guarantee/)
  })
  it('says what happens at the end and promises nothing false', () => {
    expect(renderCohortEmail('halfway', ctx).html).toMatch(/goes private/)
    for (const m of all) {
      expect(m.html).not.toMatch(/renews automatically|permanent, no expiry|cancel anytime|\$\d/i)
      expect(m.subject).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
    }
  })
  it('escapes the cohort name', () => {
    expect(all[0].html).not.toContain('<b>x</b>')
  })
})

describe('the daily job (Flow D)', () => {
  const run = () => dripGET(new NextRequest('http://localhost/api/cron/drip', { headers: { 'x-cron-secret': 'secret-cron-value' } }))
  const cohortUser = (daysSinceStart: number, extra: Row = {}) => {
    const start = Date.now() - daysSinceStart * DAY_MS
    Object.assign(rows('users')[0], { plan: 'basic', bootcamp_code: 'uniben-cs', plan_expires_at: iso(sixMonthsAfter(start)), ...extra })
  }

  it('sends the due step once, records it, and does not repeat it on the next run', async () => {
    cohortUser(3)
    rows('email_subscribers').push({ id: 'e1', email: 'ada@example.com', user_id: U1, subscribed: true, sent_flows: { d_welcome: true } })
    await run()
    expect(h.emails.map((e) => e.subject)).toEqual(['Put your portfolio link where people will see it'])
    expect(rows('email_subscribers')[0].sent_flows).toMatchObject({ d_welcome: true, d_share: true })
    await run()
    expect(h.emails).toHaveLength(1)
  })
  it('stays silent for someone who unsubscribed, and for someone who has paid', async () => {
    cohortUser(3)
    rows('email_subscribers').push({ id: 'e1', email: 'ada@example.com', user_id: U1, subscribed: false, sent_flows: {} })
    await run()
    expect(h.emails).toHaveLength(0)
    rows('email_subscribers')[0].subscribed = true
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'basic', status: 'active', created_at: iso(Date.now()), expires_at: iso(Date.now() + 300 * DAY_MS) })
    await run()
    expect(h.emails).toHaveLength(0)
  })
  it('a failed send is not recorded, so the next run tries again', async () => {
    cohortUser(3)
    rows('email_subscribers').push({ id: 'e1', email: 'ada@example.com', user_id: U1, subscribed: true, sent_flows: { d_welcome: true } })
    h.emailOk = false
    await run()
    expect(rows('email_subscribers')[0].sent_flows).not.toHaveProperty('d_share')
    h.emailOk = true
    await run()
    expect(h.emails).toHaveLength(1)
  })
  it('counts down: 7 days left sends the 7-day e-mail', async () => {
    Object.assign(rows('users')[0], { plan: 'basic', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() + 6.5 * DAY_MS) })
    rows('email_subscribers').push({ id: 'e1', email: 'ada@example.com', user_id: U1, subscribed: true, sent_flows: { d_welcome: true, d_share: true, d_cv: true, d_fresh: true, d_halfway: true, d_left30: true, d_left14: true } })
    await run()
    expect(h.emails.map((e) => e.subject)).toEqual(['Seven days left on your free access'])
  })
  it('after the access ends (plan back to Free) the cohort sequence continues and the generic "publish" nudges do not', async () => {
    Object.assign(rows('users')[0], { plan: 'unpublished', bootcamp_code: 'uniben-cs', plan_expires_at: iso(Date.now() - 0.5 * DAY_MS), created_at: iso(Date.now() - 200 * DAY_MS) })
    rows('email_subscribers').push({ id: 'e1', email: 'ada@example.com', user_id: U1, subscribed: true, sent_flows: {} })
    await run()
    expect(h.emails.map((e) => e.subject)).toEqual(['Your free access has ended: your portfolio is saved'])
  })
})

describe('the link and the sign-up', () => {
  it('the e-mail confirmation link carries the cohort code so a second device still gets the access', () => {
    expect(confirmNext(null)).toBe('/create')
    expect(confirmNext({ code: 'uniben-cs', name: 'UNIBEN Computer Science' })).toBe('/create?bootcamp=uniben-cs&name=UNIBEN%20Computer%20Science')
    expect(confirmNext({ code: 'x y', name: 'n' })).toBe('/create')
    // and what comes back through that link is captured again
    const store: Record<string, string> = {}
    const kv = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v }, removeItem: (k: string) => { delete store[k] } }
    captureAttribution('?bootcamp=uniben-cs&name=UNIBEN%20Computer%20Science', kv)
    expect(readAttribution(kv).bootcamp).toEqual({ code: 'uniben-cs', name: 'UNIBEN Computer Science' })
  })
})

describe('creating and switching off links without SQL', () => {
  const call = (fn: (r: NextRequest) => Promise<Response>, body: unknown, secret: string | null = 'secret-cron-value') =>
    fn(new NextRequest('http://localhost/api/admin/bootcamps', { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { 'x-cron-secret': secret } : {}) }, body: JSON.stringify(body) }))

  it('creates a link, defaults to Basic, and returns the URL', async () => {
    const res = await call(adminPOST, { code: 'Lagos-Bootcamp-1', name: 'Lagos Bootcamp' })
    expect(res.status).toBe(200)
    const j = await res.json()
    expect(j.link).toMatch(/\/bootcamp\/lagos-bootcamp-1$/)
    expect(rows('bootcamp_codes').find((c) => c.code === 'lagos-bootcamp-1')).toMatchObject({ plan_to_grant: 'basic', active: true, use_count: 0, max_uses: null })
  })
  it('refuses a bad code, a duplicate, a missing secret and a wrong secret', async () => {
    expect((await call(adminPOST, { code: 'Bad Code!', name: 'x' })).status).toBe(400)
    expect((await call(adminPOST, { code: 'uniben-cs', name: 'Again' })).status).toBe(409)
    expect((await call(adminPOST, { code: 'fine-code', name: 'Fine' }, null)).status).toBe(401)
    expect((await call(adminPOST, { code: 'fine-code', name: 'Fine' }, 'wrong-secret-value')).status).toBe(401)
  })
  it('switches a link off and lists links with their URL', async () => {
    const off = await call(adminPATCH, { code: 'uniben-cs', active: false })
    expect(off.status).toBe(200)
    expect(rows('bootcamp_codes')[0].active).toBe(false)
    const list = await adminGET(new NextRequest('http://localhost/api/admin/bootcamps', { headers: { 'x-cron-secret': 'secret-cron-value' } }))
    expect((await list.json()).bootcamps[0].link).toMatch(/\/bootcamp\/uniben-cs$/)
  })
})
