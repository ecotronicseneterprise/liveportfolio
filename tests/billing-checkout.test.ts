// One-time checkout (CHECKOUT_V2): server-owned price, payment intents, Paystack initialize/verify, the webhook's intent branch and the
// return-page verify. Supabase is the in-memory stand-in; Paystack is a stubbed global fetch. Nothing here touches a real service.
import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  ctx: null as null | ReturnType<typeof import('./helpers/fake-supabase').createFakeDb>,
  user: null as null | { id: string; email: string },
  emails: [] as Array<Record<string, unknown>>,
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.revalidated.push(p) } }))
vi.mock('@/lib/email', () => ({
  sendEmail: async (m: Record<string, unknown>) => { h.emails.push(m) },
  emailTemplates: { portfolioLive: (url: string) => ({ subject: 'live', html: url }) },
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeDb } = await import('./helpers/fake-supabase')
  h.ctx = createFakeDb({ users: ['id', 'slug', 'email'], payments: ['ls_order_id'], payment_intents: ['reference'] })
  const auth = { getUser: async () => (h.user ? { data: { user: { ...h.user, email_confirmed_at: '2026-01-01' } }, error: null } : { data: { user: null }, error: new Error('bad jwt') }) }
  return { getSupabaseAdmin: () => h.ctx!.admin, getSupabaseClient: () => ({ auth }) }
})

import { NextRequest } from 'next/server'
import { POST as checkoutPOST } from '../app/api/checkout/route'
import { POST as verifyPOST } from '../app/api/checkout/verify/route'
import { POST as webhookPOST } from '../app/api/paystack-webhook/route'
import { PRICES_KOBO, isTier, planForTier } from '../lib/billing/prices'
import { checkoutEnabledFor, checkoutMode } from '../lib/billing/flag'
import { initializeTransaction, verifyTransaction } from '../lib/billing/paystack'
import { billingCopy } from '../lib/billing/copy'
import { PLANS } from '../lib/plans'

const SECRET = 'sk_test_unit'
const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const DAY = 24 * 60 * 60 * 1000
type Row = Record<string, any>
const rows = (t: string): Row[] => h.ctx!.db[t]

// ── Paystack stub ────────────────────────────────────────────────────────────────────────────────────────
const px = { calls: [] as Array<{ url: string; init: RequestInit }>, initialize: null as null | (() => Response | Promise<Response>), verify: null as null | ((ref: string) => Response | Promise<Response>) }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
beforeEach(() => {
  px.calls = []; px.initialize = null; px.verify = null
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    px.calls.push({ url: String(url), init })
    if (String(url).includes('/transaction/initialize')) {
      if (px.initialize) return px.initialize()
      const body = JSON.parse(String(init.body))
      return json({ status: true, data: { authorization_url: `https://checkout.paystack.com/${body.reference}`, access_code: 'AC_1', reference: body.reference } })
    }
    if (String(url).includes('/transaction/verify/')) {
      const ref = decodeURIComponent(String(url).split('/transaction/verify/')[1])
      if (px.verify) return px.verify(ref)
      const intent = rows('payment_intents').find((i) => i.reference === ref)
      return json({ status: true, data: { status: 'success', reference: ref, amount: intent?.amount_kobo ?? 0, currency: 'NGN' } })
    }
    return json({}, 404)
  })
})

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────
function setEnv(mode?: string) {
  process.env.PAYSTACK_SECRET_KEY = SECRET
  process.env.NEXT_PUBLIC_APP_URL = 'https://liveportfolio.site'
  process.env.PAYSTACK_TEST_EMAIL = 'owner@example.com'
  process.env.PAYSTACK_BASIC_PLAN_CODE = 'PLN_basic'
  process.env.PAYSTACK_PRO_PLAN_CODE = 'PLN_pro'
  process.env.PAYSTACK_TEST_PLAN_CODE = 'PLN_test'
  process.env.PAYSTACK_PRICE_CHECK = 'enforce'
  process.env.RESEND_API_KEY = 'x'
  if (mode === undefined) delete process.env.CHECKOUT_V2
  else process.env.CHECKOUT_V2 = mode
}
const user = (id = U1, email = 'ada@example.com', extra: Row = {}) => ({ id, email, slug: `slug-${id.slice(0, 2)}`, plan: 'unpublished', ...extra })
const signIn = (id = U1, email = 'ada@example.com') => { h.user = { id, email } }
const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify(body) })
const checkout = (body: unknown) => checkoutPOST(post('/api/checkout', body))
const verify = (body: unknown) => verifyPOST(post('/api/checkout/verify', body))
const webhook = (event: unknown, sig?: string | null) => {
  const raw = JSON.stringify(event)
  const s = sig === undefined ? crypto.createHmac('sha512', SECRET).update(raw).digest('hex') : sig
  return webhookPOST(new NextRequest('http://localhost/api/paystack-webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...(s ? { 'x-paystack-signature': s } : {}) }, body: raw }))
}
const success = (intent: Row, over: Row = {}, data: Row = {}) => ({
  event: 'charge.success',
  data: { status: 'success', reference: intent.reference, amount: intent.amount_kobo, currency: 'NGN', customer: { email: 'ada@example.com' }, metadata: { user_id: intent.user_id, tier: intent.tier }, ...over, ...data },
})
const subs = (id = U1) => rows('subscriptions').filter((s) => s.user_id === id)
async function startIntent(tier = 'basic', mode = 'on') {
  setEnv(mode); signIn()
  const res = await checkout({ tier })
  expect(res.status).toBe(200)
  return { res, intent: rows('payment_intents').at(-1)! }
}

beforeEach(() => {
  const c = h.ctx!
  c.db.users = [user(), user(U2, 'bob@example.com')]; c.db.subscriptions = []; c.db.payments = []; c.db.payment_intents = []; c.db.usage_events = []
  c.failures.length = 0; c.missing.clear()
  h.user = null; h.emails = []; h.revalidated = []
  setEnv('on')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// ── pure pieces ──────────────────────────────────────────────────────────────────────────────────────────
describe('prices and the flag', () => {
  it('the server price table is in kobo and agrees with lib/plans.ts', () => {
    expect(PRICES_KOBO).toEqual({ basic: 1_500_000, pro: 4_500_000, test: 50_000 })
    expect(PRICES_KOBO.basic).toBe(PLANS.basic.priceNgn! * 100)
    expect(PRICES_KOBO.pro).toBe(PLANS.pro.priceNgn! * 100)
  })
  it('tiers and the plan they grant (the test tier grants Basic)', () => {
    expect(['basic', 'pro', 'test'].every(isTier)).toBe(true)
    for (const bad of ['', 'free', 'PRO', 5, null, undefined, {}, ['pro']]) expect(isTier(bad), String(bad)).toBe(false)
    expect(planForTier('basic')).toBe('basic'); expect(planForTier('pro')).toBe('pro'); expect(planForTier('test')).toBe('basic')
  })
  it('CHECKOUT_V2: anything but "on" or "owner" is off; owner mode is the PAYSTACK_TEST_EMAIL account only', () => {
    for (const raw of ['', 'off', 'true', '1', 'ON', 'yes']) expect(checkoutMode(raw), raw).toBe('off')
    delete process.env.CHECKOUT_V2
    expect(checkoutMode()).toBe('off') // not set at all: off
    expect(checkoutMode('on')).toBe('on'); expect(checkoutMode('owner')).toBe('owner')
    expect(checkoutEnabledFor('x@y.z', 'off', 'owner@example.com')).toBe(false)
    expect(checkoutEnabledFor('x@y.z', 'on', 'owner@example.com')).toBe(true)
    expect(checkoutEnabledFor('Owner@Example.com', 'owner', 'owner@example.com')).toBe(true)
    expect(checkoutEnabledFor('x@y.z', 'owner', 'owner@example.com')).toBe(false)
    expect(checkoutEnabledFor(null, 'owner', 'owner@example.com')).toBe(false)
    expect(checkoutEnabledFor('x@y.z', 'owner', undefined)).toBe(false)
  })
})

describe('the Paystack client', () => {
  it('initialize: server amount in kobo, our reference and callback, NO plan and NO channels, secret in the header only', async () => {
    const r = await initializeTransaction({ email: 'ada@example.com', amountKobo: 1_500_000, reference: 'lpi_abc', callbackUrl: 'https://liveportfolio.site/checkout/return', metadata: { user_id: U1, tier: 'basic' } })
    expect(r).toEqual({ ok: true, authorizationUrl: 'https://checkout.paystack.com/lpi_abc', accessCode: 'AC_1' })
    const call = px.calls[0]
    const body = JSON.parse(String(call.init.body))
    expect(call.url).toBe('https://api.paystack.co/transaction/initialize')
    expect(body).toEqual({ email: 'ada@example.com', amount: 1_500_000, currency: 'NGN', reference: 'lpi_abc', callback_url: 'https://liveportfolio.site/checkout/return', metadata: { user_id: U1, tier: 'basic' } })
    expect('plan' in body || 'channels' in body).toBe(false)
    expect((call.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`)
    expect(String(call.init.body)).not.toContain(SECRET)
  })
  it('initialize: an error, a refusal, a network failure and a timeout all become { ok: false } without the key in any message', async () => {
    px.initialize = () => json({ status: false, message: 'Invalid key' }, 401)
    expect(await initializeTransaction({ email: 'a@b.co', amountKobo: 1, reference: 'r', callbackUrl: 'u', metadata: {} })).toEqual({ ok: false })
    px.initialize = () => { throw new Error('socket hang up') }
    expect(await initializeTransaction({ email: 'a@b.co', amountKobo: 1, reference: 'r', callbackUrl: 'u', metadata: {} })).toEqual({ ok: false })
    delete process.env.PAYSTACK_SECRET_KEY
    expect(await initializeTransaction({ email: 'a@b.co', amountKobo: 1, reference: 'r', callbackUrl: 'u', metadata: {} })).toEqual({ ok: false })
  })
  it('verify: reads data.status (not the top-level status), amount, currency and reference', async () => {
    px.verify = () => json({ status: true, data: { status: 'abandoned', reference: 'lpi_x', amount: 1_500_000, currency: 'NGN' } })
    expect(await verifyTransaction('lpi_x')).toEqual({ ok: true, status: 'abandoned', amount: 1_500_000, currency: 'NGN', reference: 'lpi_x' })
    px.verify = () => json({ status: false, message: 'Transaction reference not found' }, 404)
    expect(await verifyTransaction('lpi_x')).toEqual({ ok: false })
    px.verify = () => { throw new Error('boom') }
    expect(await verifyTransaction('lpi_x')).toEqual({ ok: false })
    px.verify = () => json({ status: true, data: { status: 'success', amount: 'abc' } })
    expect(await verifyTransaction('lpi_x')).toEqual({ ok: false }) // unreadable amount is refused, not guessed
  })
  it('verify: the reference is URL-encoded into the path', async () => {
    await verifyTransaction('a/b c')
    expect(px.calls[0].url).toBe('https://api.paystack.co/transaction/verify/a%2Fb%20c')
  })
})

// ── POST /api/checkout ───────────────────────────────────────────────────────────────────────────────────
describe('POST /api/checkout', () => {
  it('401 when signed out', async () => {
    h.user = null
    expect((await checkout({ tier: 'basic' })).status).toBe(401)
    expect(px.calls).toHaveLength(0)
  })
  it('flag off: 404 checkout_v2_disabled, nothing created, Paystack not called (the modal then uses the old flow)', async () => {
    setEnv(undefined); signIn()
    const res = await checkout({ tier: 'basic' })
    expect(res.status).toBe(404); expect((await res.json()).error).toBe('checkout_v2_disabled')
    expect(rows('payment_intents')).toHaveLength(0); expect(px.calls).toHaveLength(0)
  })
  it('owner mode: refused for everyone but the PAYSTACK_TEST_EMAIL account', async () => {
    setEnv('owner'); signIn()
    expect((await checkout({ tier: 'basic' })).status).toBe(404)
    h.ctx!.db.users.push(user('33333333-3333-4333-8333-333333333333', 'owner@example.com'))
    signIn('33333333-3333-4333-8333-333333333333', 'owner@example.com')
    expect((await checkout({ tier: 'basic' })).status).toBe(200)
  })
  it('creates a pending intent with the SERVER price and returns the Paystack URL; the reference is ours and unguessable', async () => {
    const { res, intent } = await startIntent('basic')
    const j = await res.json()
    expect(j.authorization_url).toBe(`https://checkout.paystack.com/${intent.reference}`)
    expect(intent).toMatchObject({ user_id: U1, tier: 'basic', amount_kobo: 1_500_000, currency: 'NGN', status: 'pending', access_code: 'AC_1' })
    expect(intent.reference).toMatch(/^lpi_[A-Za-z0-9_-]{24,}$/)
    const body = JSON.parse(String(px.calls[0].init.body))
    expect(body.amount).toBe(1_500_000); expect(body.email).toBe('ada@example.com'); expect(body.metadata).toMatchObject({ user_id: U1, tier: 'basic' })
  })
  it('the client cannot choose the amount, currency, reference, e-mail or user', async () => {
    setEnv('on'); signIn()
    await checkout({ tier: 'pro', amount: 1, amount_kobo: 1, currency: 'USD', reference: 'mine', email: 'evil@example.com', user_id: U2, userId: U2 })
    const body = JSON.parse(String(px.calls[0].init.body))
    expect(body.amount).toBe(4_500_000); expect(body.currency).toBe('NGN'); expect(body.reference).not.toBe('mine')
    expect(body.email).toBe('ada@example.com'); expect(body.metadata.user_id).toBe(U1)
    expect(rows('payment_intents')[0]).toMatchObject({ user_id: U1, amount_kobo: 4_500_000 })
  })
  it('unknown tiers are 400; the test tier is refused for anyone but the owner', async () => {
    setEnv('on'); signIn()
    for (const t of ['', 'free', 'PRO', 5, null, undefined, 'enterprise']) expect((await checkout({ tier: t })).status, String(t)).toBe(400)
    expect((await checkout({ tier: 'test' })).status).toBe(403)
    expect(rows('payment_intents')).toHaveLength(0)
    h.ctx!.db.users.push(user('33333333-3333-4333-8333-333333333333', 'owner@example.com'))
    signIn('33333333-3333-4333-8333-333333333333', 'owner@example.com')
    const ok = await checkout({ tier: 'test' })
    expect(ok.status).toBe(200)
    expect(rows('payment_intents')[0]).toMatchObject({ tier: 'test', amount_kobo: 50_000 })
  })
  it('an account with no profile row is 400, not a crash', async () => {
    setEnv('on'); signIn('99999999-9999-4999-8999-999999999999', 'ghost@example.com')
    expect((await checkout({ tier: 'basic' })).status).toBe(400)
  })
  it('Basic is refused while a Pro plan is active (never a silent downgrade); renewing the same plan is allowed', async () => {
    setEnv('on'); signIn()
    rows('subscriptions').push({ id: 's1', user_id: U1, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 200 * DAY).toISOString() })
    const res = await checkout({ tier: 'basic' })
    expect(res.status).toBe(409); expect((await res.json()).error).toBe('already_has_higher_plan')
    expect((await checkout({ tier: 'pro' })).status).toBe(200)
  })
  it('at most 10 checkouts per user per hour', async () => {
    setEnv('on'); signIn()
    for (let i = 0; i < 10; i++) expect((await checkout({ tier: 'basic' })).status).toBe(200)
    expect((await checkout({ tier: 'basic' })).status).toBe(429)
  })
  it('a Paystack failure is a 502 and the intent is marked failed (nothing is left pending)', async () => {
    setEnv('on'); signIn()
    px.initialize = () => json({ status: false, message: 'nope' }, 500)
    const res = await checkout({ tier: 'basic' })
    expect(res.status).toBe(502)
    expect(rows('payment_intents')[0].status).toBe('failed')
  })
  it('without the intents table (migration not run) it answers 503 and calls nobody', async () => {
    setEnv('on'); signIn(); h.ctx!.missing.add('payment_intents')
    expect((await checkout({ tier: 'basic' })).status).toBe(503)
    expect(px.calls).toHaveLength(0)
  })
})

// ── webhook: intents ─────────────────────────────────────────────────────────────────────────────────────
describe('webhook: charge.success for a reference we created', () => {
  it('grants once: payment row, a 12-month subscription, the plan cache, the intent marked paid, one e-mail; users.plan_expires_at stays empty', async () => {
    const { intent } = await startIntent('basic')
    expect((await webhook(success(intent))).status).toBe(200)
    expect(rows('users').find((u) => u.id === U1)).toMatchObject({ plan: 'basic' })
    expect(rows('users').find((u) => u.id === U1)!.plan_expires_at).toBeUndefined()
    expect(rows('payments')).toEqual([expect.objectContaining({ ls_order_id: intent.reference, product_tier: 'basic', amount_cents: 1_500_000, user_id: U1 })])
    expect(subs()).toHaveLength(1)
    const left = new Date(subs()[0].expires_at).getTime() - Date.now()
    expect(left).toBeGreaterThan(364 * DAY); expect(left).toBeLessThan(366 * DAY)
    expect(rows('payment_intents')[0]).toMatchObject({ status: 'paid' })
    expect(h.emails).toHaveLength(1)
    expect(h.revalidated).toContain('/slug-11')
  })
  it('works with NO plan code in the event (bank transfer, USSD, card alike): the tier comes from our intent', async () => {
    const { intent } = await startIntent('pro')
    await webhook(success(intent, { plan: undefined, channel: 'bank_transfer' }))
    expect(rows('users').find((u) => u.id === U1)!.plan).toBe('pro')
    expect(subs()[0].plan).toBe('pro')
  })
  it('a duplicate delivery changes nothing', async () => {
    const { intent } = await startIntent('basic')
    await webhook(success(intent)); await webhook(success(intent)); await webhook(success(intent))
    expect(rows('payments')).toHaveLength(1); expect(subs()).toHaveLength(1); expect(h.emails).toHaveLength(1)
  })
  it.each([
    ['wrong amount', { amount: 100 }],
    ['the Pro price on a Basic intent', { amount: 4_500_000 }],
    ['wrong currency', { currency: 'USD' }],
    ['status not success', { status: 'failed' }],
    ['amount as a string', { amount: '1500000' }],
  ])('%s: nothing granted, 200, and a log line', async (_n, over) => {
    const { intent } = await startIntent('basic')
    expect((await webhook(success(intent, over))).status).toBe(200)
    expect(rows('payments')).toHaveLength(0); expect(subs()).toHaveLength(0)
    expect(rows('users').find((u) => u.id === U1)!.plan).toBe('unpublished')
    expect(rows('payment_intents')[0].status).toBe('pending')
    expect(vi.mocked(console.warn).mock.calls.some((c) => String(c[0]).includes('reason=intent_mismatch'))).toBe(true)
  })
  it('another user\'s metadata with a different payer e-mail is refused; the same payer e-mail is accepted', async () => {
    const { intent } = await startIntent('basic')
    await webhook(success(intent, { metadata: { user_id: U2 }, customer: { email: 'bob@example.com' } }))
    expect(rows('payments')).toHaveLength(0)
    await webhook(success(intent, { metadata: {}, customer: { email: 'ADA@example.com' } })) // no metadata, but the payer is the account holder
    expect(rows('payments')).toHaveLength(1)
  })
  it('an expired intent that Paystack confirms as paid is still granted (money was taken)', async () => {
    const { intent } = await startIntent('basic')
    rows('payment_intents')[0].status = 'expired'; rows('payment_intents')[0].expires_at = new Date(Date.now() - DAY).toISOString()
    await webhook(success(intent))
    expect(rows('payments')).toHaveLength(1); expect(rows('payment_intents')[0].status).toBe('paid')
  })
  it('stacks time: renewing a plan that has 100 days left ends in 100 + 365 days', async () => {
    const { intent } = await startIntent('basic')
    rows('subscriptions').push({ id: 's0', user_id: U1, plan: 'basic', status: 'active', created_at: new Date(Date.now() - 265 * DAY).toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
    await webhook(success(intent))
    expect(subs()).toHaveLength(1)
    const left = (new Date(subs()[0].expires_at).getTime() - Date.now()) / DAY
    expect(left).toBeGreaterThan(463); expect(left).toBeLessThan(466)
    expect(h.emails).toHaveLength(0) // not a first activation, so no "you are live" e-mail
  })
  it('Pro bought on top of Basic upgrades the plan on the same subscription and stacks the time', async () => {
    const { intent } = await startIntent('pro')
    rows('subscriptions').push({ id: 's0', user_id: U1, plan: 'basic', status: 'active', created_at: new Date(Date.now() - 265 * DAY).toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
    rows('users')[0].plan = 'basic'
    await webhook(success(intent))
    expect(subs()).toHaveLength(1); expect(subs()[0].plan).toBe('pro'); expect(rows('users')[0].plan).toBe('pro')
  })
  it('the owner test tier grants Basic, and a full refund takes it away again', async () => {
    h.ctx!.db.users.push(user('33333333-3333-4333-8333-333333333333', 'owner@example.com'))
    setEnv('on'); signIn('33333333-3333-4333-8333-333333333333', 'owner@example.com')
    await checkout({ tier: 'test' })
    const intent = rows('payment_intents')[0]
    await webhook(success(intent, { customer: { email: 'owner@example.com' } }))
    const owner = rows('users').find((u) => u.id === intent.user_id)!
    expect(owner.plan).toBe('basic'); expect(rows('payments')[0]).toMatchObject({ product_tier: 'basic', amount_cents: 50_000 })
    await webhook({ event: 'refund.processed', data: { transaction_reference: intent.reference, amount: 50_000, currency: 'NGN' } })
    expect(owner.plan).toBe('unpublished'); expect(rows('payments')[0].refunded_at).toBeTruthy()
    expect(rows('subscriptions')[0].status).toBe('expired')
    expect(rows('payment_intents')[0].status).toBe('refunded')
  })
  it('a database failure while granting releases the claim and answers 500 so Paystack retries; the retry then succeeds', async () => {
    const { intent } = await startIntent('basic')
    h.ctx!.failures.push({ table: 'users', op: 'update' })
    expect((await webhook(success(intent))).status).toBe(500)
    expect(rows('payments')).toHaveLength(0)
    expect((await webhook(success(intent))).status).toBe(200)
    expect(rows('payments')).toHaveLength(1)
  })
  it('the old plan-code path is untouched: an unknown reference with a known plan code still grants (the Test 500 subscription and renewals)', async () => {
    const res = await webhook({ event: 'charge.success', data: { reference: 'legacy-1', amount: 1_500_000, currency: 'NGN', customer: { email: 'ada@example.com' }, plan: { plan_code: 'PLN_basic' } } })
    expect(res.status).toBe(200)
    expect(rows('users').find((u) => u.id === U1)!.plan).toBe('basic')
    expect(rows('payments')[0].ls_order_id).toBe('legacy-1')
  })
  it('the old path also still works when the intents table does not exist yet', async () => {
    h.ctx!.missing.add('payment_intents')
    const res = await webhook({ event: 'charge.success', data: { reference: 'legacy-2', amount: 1_500_000, currency: 'NGN', customer: { email: 'ada@example.com' }, plan: { plan_code: 'PLN_basic' } } })
    expect(res.status).toBe(200); expect(rows('payments')).toHaveLength(1)
  })
  it('an unknown reference with no plan code is still ignored and logged', async () => {
    await webhook({ event: 'charge.success', data: { reference: 'who-knows', amount: 1_500_000, currency: 'NGN', customer: { email: 'ada@example.com' } } })
    expect(rows('payments')).toHaveLength(0)
    expect(vi.mocked(console.warn).mock.calls.some((c) => String(c[0]).includes('reason=no_plan_code'))).toBe(true)
  })
  it('a bad signature is still 400 and writes nothing', async () => {
    const { intent } = await startIntent('basic')
    expect((await webhook(success(intent), 'deadbeef')).status).toBe(400)
    expect(rows('payments')).toHaveLength(0)
  })
  it('a database error on the intent lookup (not "table missing") asks Paystack to retry instead of falling back', async () => {
    const { intent } = await startIntent('basic')
    h.ctx!.failures.push({ table: 'payment_intents', op: 'select' })
    expect((await webhook(success(intent))).status).toBe(500)
    expect(rows('payments')).toHaveLength(0)
  })
})

// ── POST /api/checkout/verify (the return page) ──────────────────────────────────────────────────────────
describe('POST /api/checkout/verify', () => {
  it('401 signed out; 400 without a reference; 404 for a reference that is not yours or does not exist', async () => {
    h.user = null
    expect((await verify({ reference: 'x' })).status).toBe(401)
    signIn()
    expect((await verify({})).status).toBe(400)
    expect((await verify({ reference: 'nope' })).status).toBe(404)
    const { intent } = await startIntent('basic')
    signIn(U2, 'bob@example.com')
    expect((await verify({ reference: intent.reference })).status).toBe(404)
    expect(rows('payments')).toHaveLength(0)
  })
  it('success: verifies with Paystack, grants through the same function, and answers paid', async () => {
    const { intent } = await startIntent('basic')
    const res = await verify({ reference: intent.reference })
    const j = await res.json()
    expect(res.status).toBe(200); expect(j).toMatchObject({ status: 'paid', plan: 'basic' }); expect(typeof j.expires_at).toBe('string')
    expect(rows('users').find((u) => u.id === U1)!.plan).toBe('basic')
    expect(rows('payments')).toHaveLength(1); expect(subs()).toHaveLength(1)
    expect(px.calls.some((c) => c.url.includes('/transaction/verify/'))).toBe(true)
  })
  it('the webhook and the return page racing in either order produce ONE payment and ONE subscription', async () => {
    const a = await startIntent('basic')
    await webhook(success(a.intent)); await verify({ reference: a.intent.reference })
    expect(rows('payments')).toHaveLength(1); expect(subs()).toHaveLength(1)
    h.ctx!.db.payments = []; h.ctx!.db.subscriptions = []; h.ctx!.db.payment_intents = []
    rows('users').forEach((u) => { u.plan = 'unpublished' })
    const b = await startIntent('basic')
    await verify({ reference: b.intent.reference }); await webhook(success(b.intent))
    expect(rows('payments')).toHaveLength(1); expect(subs()).toHaveLength(1)
    const [r1, r2] = await Promise.all([verify({ reference: b.intent.reference }), webhook(success(b.intent))])
    expect([r1.status, r2.status]).toEqual([200, 200])
    expect(rows('payments')).toHaveLength(1)
  })
  it('an already-paid intent answers paid without asking Paystack again', async () => {
    const { intent } = await startIntent('basic')
    await verify({ reference: intent.reference })
    px.calls = []
    const j = await (await verify({ reference: intent.reference })).json()
    expect(j.status).toBe('paid'); expect(px.calls).toHaveLength(0)
  })
  it.each([
    ['ongoing', 'pending'], ['pending', 'pending'], ['processing', 'pending'], ['queued', 'pending'],
  ])('Paystack says %s: answered as %s, nothing granted, the intent stays open', async (status, expected) => {
    const { intent } = await startIntent('basic')
    px.verify = (ref) => json({ status: true, data: { status, reference: ref, amount: intent.amount_kobo, currency: 'NGN' } })
    const j = await (await verify({ reference: intent.reference })).json()
    expect(j.status).toBe(expected); expect(rows('payments')).toHaveLength(0); expect(rows('payment_intents')[0].status).toBe('pending')
  })
  it.each([['abandoned'], ['failed'], ['reversed']])('Paystack says %s: reported plainly, intent marked, nothing granted', async (status) => {
    const { intent } = await startIntent('basic')
    px.verify = (ref) => json({ status: true, data: { status, reference: ref, amount: intent.amount_kobo, currency: 'NGN' } })
    const j = await (await verify({ reference: intent.reference })).json()
    expect(j.status).toBe(status === 'abandoned' ? 'abandoned' : 'failed')
    expect(rows('payments')).toHaveLength(0); expect(rows('payment_intents')[0].status).toBe('failed')
  })
  it('a Paystack outage or timeout answers pending (the webhook can still grant); it never grants on its own', async () => {
    const { intent } = await startIntent('basic')
    px.verify = () => { throw new Error('ETIMEDOUT') }
    const res = await verify({ reference: intent.reference })
    expect(res.status).toBe(200); expect((await res.json()).status).toBe('pending')
    expect(rows('payments')).toHaveLength(0)
  })
  it('a success with the wrong amount, currency or reference is refused and logged, not granted', async () => {
    const { intent } = await startIntent('basic')
    for (const data of [{ amount: 100 }, { currency: 'USD' }, { reference: 'someone-elses' }]) {
      px.verify = (ref) => json({ status: true, data: { status: 'success', reference: ref, amount: intent.amount_kobo, currency: 'NGN', ...data } })
      const res = await verify({ reference: intent.reference })
      expect(res.status).toBe(409)
    }
    expect(rows('payments')).toHaveLength(0)
  })
  it('a failed intent can still be granted if Paystack later confirms success (late payment)', async () => {
    const { intent } = await startIntent('basic')
    rows('payment_intents')[0].status = 'failed'
    const j = await (await verify({ reference: intent.reference })).json()
    expect(j.status).toBe('paid'); expect(rows('payments')).toHaveLength(1)
  })
})

// ── copy follows the mode ────────────────────────────────────────────────────────────────────────────────
describe('billing copy matches the checkout that is live', () => {
  it('one-time mode: one payment for 12 months, no "cancel anytime" and no "renews"; both modes: a 7-day refund guarantee', () => {
    const one = billingCopy(true), sub = billingCopy(false)
    for (const s of Object.values(one)) { expect(s).not.toMatch(/cancel anytime|renews automatically|auto-?renew/i) }
    expect(one.modalFooter).toMatch(/12 months/i)
    expect(sub.modalFooter).toMatch(/cancel anytime/i)
    for (const c of [one, sub]) { expect(c.modalFooter).toMatch(/7-day refund guarantee/i); expect(c.pricingNote).toMatch(/7-day refund guarantee/i); expect(c.landingNote).toMatch(/7-day refund/i) }
  })
})
