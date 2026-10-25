// GET /api/billing and the dashboard "Plan and billing" panel.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'] })
  const auth = { getUser: async () => (h.user ? { data: { user: { ...h.user, email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { GET } from '../app/api/billing/route'
import { PlanBillingView, type Billing } from '../components/dashboard/PlanBillingPanel'
import { SUPPORT_EMAIL } from '../lib/brand'

const DAY = 24 * 60 * 60 * 1000
const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const get = () => GET(new NextRequest('http://localhost/api/billing', { headers: { authorization: 'Bearer t' } }))
const rows = (t: string) => h.ctx!.db[t]
const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')

beforeEach(() => {
  const c = h.ctx!
  c.db.users = [{ id: U1, email: 'ada@example.com', slug: 'ada', plan: 'unpublished' }, { id: U2, email: 'bob@example.com', slug: 'bob', plan: 'pro' }]
  c.db.subscriptions = []; c.db.payments = []
  c.failures.length = 0
  h.user = { id: U1, email: 'ada@example.com' }
})

describe('GET /api/billing', () => {
  it('401 signed out', async () => {
    h.user = null
    expect((await get()).status).toBe(401)
  })
  it('a free account: plan free, no end date, no payments, no payment type', async () => {
    const j = await (await get()).json()
    expect(j).toEqual({ plan: 'free', expires_at: null, days_left: null, one_time: null, payments: [] })
  })
  it('a one-time payer: the plan, the end date, days left, newest payments first, and no references anywhere', async () => {
    rows('users')[0].plan = 'basic'
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'basic', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY + 3600_000).toISOString() })
    rows('payments').push({ id: 'p1', user_id: U1, ls_order_id: 'lpi_secretreference12345678', product_tier: 'basic', amount_cents: 1_500_000, refunded_at: null, created_at: '2026-10-01T10:00:00.000Z' })
    rows('payments').push({ id: 'p0', user_id: U1, ls_order_id: 'lpi_olderreference123456789', product_tier: 'basic', amount_cents: 1_500_000, refunded_at: '2026-06-02T00:00:00.000Z', created_at: '2026-05-30T10:00:00.000Z' })
    const res = await get()
    const body = await res.text()
    const j = JSON.parse(body)
    expect(j.plan).toBe('basic'); expect(j.one_time).toBe(true); expect(j.days_left).toBe(101)
    expect(j.payments).toEqual([
      { date: '2026-10-01T10:00:00.000Z', plan: 'basic', amount_kobo: 1_500_000, refunded: false },
      { date: '2026-05-30T10:00:00.000Z', plan: 'basic', amount_kobo: 1_500_000, refunded: true },
    ])
    expect(body).not.toMatch(/lpi_|ls_order_id|reference/)
  })
  it('a person who paid through the old plan-code checkout is reported as not one-time', async () => {
    rows('payments').push({ id: 'p1', user_id: U1, ls_order_id: '1234567890', product_tier: 'basic', amount_cents: 1_500_000, refunded_at: null, created_at: '2026-10-01T10:00:00.000Z' })
    expect((await (await get()).json()).one_time).toBe(false)
  })
  it("never shows another account's payments or plan", async () => {
    rows('payments').push({ id: 'px', user_id: U2, ls_order_id: 'lpi_bobsreference1234567890', product_tier: 'pro', amount_cents: 4_500_000, refunded_at: null, created_at: '2026-10-01T10:00:00.000Z' })
    rows('subscriptions').push({ id: 'sx', user_id: U2, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300 * DAY).toISOString() })
    const j = await (await get()).json()
    expect(j.plan).toBe('free'); expect(j.payments).toEqual([]); expect(j.expires_at).toBeNull()
  })
  it('lists at most the last five payments', async () => {
    for (let i = 0; i < 8; i++) rows('payments').push({ id: `p${i}`, user_id: U1, ls_order_id: `lpi_ref${i}xxxxxxxxxxxxxxxxxxxx`, product_tier: 'basic', amount_cents: 1_500_000, refunded_at: null, created_at: `2026-0${i + 1}-01T00:00:00.000Z` })
    expect((await (await get()).json()).payments).toHaveLength(5)
  })
  it('a database error is a plain 500, not a crash with details', async () => {
    h.ctx!.failures.push({ table: 'payments', op: 'select' })
    const res = await get()
    expect(res.status).toBe(500); expect(JSON.stringify(await res.json())).toBe('{"error":"billing_unavailable"}')
  })
})

describe('the Plan and billing panel', () => {
  const base: Billing = { plan: 'free', expires_at: null, days_left: null, one_time: null, payments: [] }
  const on = () => {}
  it('free: says private, offers Publish, and gives the refund guarantee with the support address', () => {
    const t = text(createElement(PlanBillingView, { b: base, onPay: on }))
    expect(t).toMatch(/Free plan/); expect(t).toMatch(/private/i); expect(t).toContain('Publish my portfolio')
    expect(t).toMatch(/7-day refund guarantee/); expect(t).toContain(SUPPORT_EMAIL)
    expect(t).not.toContain('Payments')
  })
  it('one-time Basic: the end date, days left, "does not renew automatically", a renew button, and the payment list in Naira', () => {
    const t = text(createElement(PlanBillingView, {
      b: { plan: 'basic', expires_at: '2027-10-05T10:00:00.000Z', days_left: 346, one_time: true, payments: [{ date: '2026-10-05T10:00:00.000Z', plan: 'basic', amount_kobo: 1_500_000, refunded: false }, { date: '2026-05-01T10:00:00.000Z', plan: 'pro', amount_kobo: 4_500_000, refunded: true }] },
      onPay: on,
    }))
    expect(t).toMatch(/Basic plan, active until 5 October 2027/); expect(t).toContain('346 days left')
    expect(t).toMatch(/does not renew automatically/); expect(t).toContain('Renew for 12 months')
    expect(t).toContain('₦15,000 Paid'); expect(t).toContain('₦45,000 Refunded')
    expect(t).not.toMatch(/we email you/i)
  })
  it('an old subscription payer is not told "no automatic renewal"', () => {
    const t = text(createElement(PlanBillingView, { b: { plan: 'pro', expires_at: '2027-01-01T00:00:00.000Z', days_left: 90, one_time: false, payments: [] }, onPay: on }))
    expect(t).not.toMatch(/does not renew automatically/); expect(t).toContain('Manage or upgrade')
  })
  it('1 day left reads "1 day", not "1 days"', () => {
    expect(text(createElement(PlanBillingView, { b: { plan: 'basic', expires_at: '2026-10-25T00:00:00.000Z', days_left: 1, one_time: true, payments: [] }, onPay: on }))).toContain('1 day left')
  })
  it('the dashboard mounts it in the account tab', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
    expect(src).toMatch(/<PlanBillingPanel token=\{accessToken\} onPay=\{\(\) => setShowUpgradeModal\(true\)\}[\s\S]*?\/>/)
  })
})
