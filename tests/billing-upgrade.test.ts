// Basic to Pro upgrade through the one-time checkout: the server prices it from the days left, refuses a stale or invented amount,
// and the grant starts a fresh 12 months from payment (a normal Pro purchase still stacks, as before).
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  inits: [] as Array<Record<string, any>>,
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {}, emailTemplates: { portfolioLive: () => ({ subject: 's', html: 'h' }) } }))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], payment_intents: ['reference'] })
  const auth = { getUser: async () => (h.user ? { data: { user: { ...h.user, email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { POST as checkoutPOST } from '../app/api/checkout/route'
import { grantIntent, YEAR_MS } from '../lib/billing/grant'
import { DAY_MS, upgradePriceKobo } from '../lib/billing/upgrade'
import { PRICES_KOBO } from '../lib/billing/prices'

const U1 = '11111111-1111-4111-8111-111111111111'
type Row = Record<string, any>
const rows = (t: string): Row[] => h.ctx!.db[t]
const post = (body: unknown) => checkoutPOST(new NextRequest('http://localhost/api/checkout', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify(body) }))

function basicOwner(daysLeft: number) {
  rows('users').push({ id: U1, email: 'ada@example.com', slug: 'ada', plan: 'basic' })
  rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'basic', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + daysLeft * DAY_MS - 60_000).toISOString() })
}

beforeEach(() => {
  for (const k of ['users', 'subscriptions', 'payments', 'payment_intents']) h.ctx!.db[k] = []
  h.user = { id: U1, email: 'ada@example.com' }
  h.inits = []
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit'
  process.env.NEXT_PUBLIC_APP_URL = 'https://liveportfolio.site'
  vi.stubGlobal('fetch', async (_u: string, init: RequestInit = {}) => {
    const body = JSON.parse(String(init.body))
    h.inits.push(body)
    return new Response(JSON.stringify({ status: true, data: { authorization_url: `https://checkout.paystack.com/${body.reference}`, access_code: 'AC' } }), { status: 200 })
  })
})

describe('upgrade checkout', () => {
  it('charges the server-computed price, stores it on the intent, and sends it to Paystack', async () => {
    basicOwner(200)
    const want = upgradePriceKobo(200)
    const res = await post({ tier: 'pro', upgrade: true, expected_kobo: want })
    expect(res.status).toBe(200)
    expect(h.inits[0].amount).toBe(want)
    expect(rows('payment_intents')[0].amount_kobo).toBe(want)
    expect(want).toBeLessThan(PRICES_KOBO.pro - PRICES_KOBO.basic)
  })

  it('refuses an amount that is not the current price and says what it is now', async () => {
    basicOwner(200)
    const res = await post({ tier: 'pro', upgrade: true, expected_kobo: 100 })
    expect(res.status).toBe(409)
    expect((await res.json()).amount_kobo).toBe(upgradePriceKobo(200))
    expect(h.inits).toHaveLength(0)
  })

  it('refuses an upgrade from Free or from Pro, and for any tier but pro', async () => {
    rows('users').push({ id: U1, email: 'ada@example.com', slug: 'ada', plan: 'unpublished' })
    expect((await post({ tier: 'pro', upgrade: true })).status).toBe(409) // free (no subscription)
    rows('users')[0].plan = 'pro'
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY_MS).toISOString() })
    expect((await post({ tier: 'pro', upgrade: true })).status).toBe(409)
    expect([400, 409]).toContain((await post({ tier: 'basic', upgrade: true })).status) // never an upgrade to Basic (the existing higher-plan guard answers first)
  })

  it('a plain Pro purchase is still the full price', async () => {
    basicOwner(200)
    expect((await post({ tier: 'pro' })).status).toBe(200)
    expect(h.inits[0].amount).toBe(PRICES_KOBO.pro)
  })
})

describe('upgrade grant', () => {
  const intent = (amount: number) => ({ id: 'i1', user_id: U1, tier: 'pro' as const, amount_kobo: amount, reference: 'lpi_up', granted_expires_at: null })
  it('an upgrade starts a new 12 months from now (does not stack on the Basic time left)', async () => {
    basicOwner(200)
    rows('payment_intents').push({ id: 'i1', user_id: U1, reference: 'lpi_up', status: 'pending', granted_expires_at: null })
    await grantIntent(h.ctx!.admin as never, intent(2_000_000))
    const exp = new Date(rows('subscriptions')[0].expires_at).getTime()
    expect(Math.abs(exp - (Date.now() + YEAR_MS))).toBeLessThan(5000)
    expect(rows('subscriptions')[0].plan).toBe('pro')
    expect(rows('users')[0].plan).toBe('pro')
  })
  it('a full-price Pro purchase still stacks on the time left', async () => {
    basicOwner(200)
    rows('payment_intents').push({ id: 'i1', user_id: U1, reference: 'lpi_up', status: 'pending', granted_expires_at: null })
    await grantIntent(h.ctx!.admin as never, intent(PRICES_KOBO.pro))
    const exp = new Date(rows('subscriptions')[0].expires_at).getTime()
    expect(exp).toBeGreaterThan(Date.now() + YEAR_MS + 190 * DAY_MS)
  })
  it('granting twice records one payment (idempotent)', async () => {
    basicOwner(200)
    rows('payment_intents').push({ id: 'i1', user_id: U1, reference: 'lpi_up', status: 'pending', granted_expires_at: null })
    await grantIntent(h.ctx!.admin as never, intent(2_000_000))
    expect(await grantIntent(h.ctx!.admin as never, intent(2_000_000))).toBe('duplicate')
    expect(rows('payments')).toHaveLength(1)
  })
})
