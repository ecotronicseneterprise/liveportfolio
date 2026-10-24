// Paystack webhook: signature, price verification, claim-first idempotency, retries on database errors,
// user matching, renewal / upgrade / cancellation and refunds. Supabase, e-mail and cache revalidation are faked in memory.
import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, any>
const h = vi.hoisted(() => ({
  db: { users: [] as Row[], subscriptions: [] as Row[], payments: [] as Row[] } as Record<string, Row[]>,
  // fail('subscriptions', 'update') makes that operation return a database error once (or forever with sticky)
  failures: [] as Array<{ table: string; op: string; sticky?: boolean }>,
  emails: [] as Row[],
  revalidated: [] as string[],
  seq: 0,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: async (m: Row) => { h.emails.push(m) },
  emailTemplates: { portfolioLive: (url: string) => ({ subject: 'live', html: url }) },
}))
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => { h.revalidated.push(p) } }))
vi.mock('@/lib/supabase', () => {
  function takeFailure(table: string, op: string) {
    const i = h.failures.findIndex((f) => f.table === table && f.op === op)
    if (i === -1) return null
    const f = h.failures[i]
    if (!f.sticky) h.failures.splice(i, 1)
    return { message: `injected ${table}.${op} failure` }
  }
  function builder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: Row = {}
    const filters: Array<(r: Row) => boolean> = []
    let orderCol: string | null = null
    let max: number | null = null
    const match = (r: Row) => filters.every((f) => f(r))
    const run = (single: boolean) => {
      const err = takeFailure(table, op)
      if (err) return { data: null, error: err }
      const rows = h.db[table]
      if (op === 'insert') {
        if (table === 'payments' && rows.some((r) => r.ls_order_id === payload.ls_order_id)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "payments_ls_order_id_key"' } }
        }
        rows.push({ id: `id-${++h.seq}`, created_at: new Date(Date.now() + h.seq).toISOString(), ...payload })
        return { data: null, error: null }
      }
      if (op === 'update') {
        for (const r of rows.filter(match)) Object.assign(r, payload)
        return { data: null, error: null }
      }
      if (op === 'delete') {
        h.db[table] = rows.filter((r) => !match(r))
        return { data: null, error: null }
      }
      let out = rows.filter(match)
      if (orderCol) out = [...out].sort((a, b) => String(b[orderCol!]).localeCompare(String(a[orderCol!])))
      if (max !== null) out = out.slice(0, max)
      return { data: single ? (out[0] ?? null) : out, error: null }
    }
    const q: any = {
      select: () => q,
      insert: (row: Row) => { op = 'insert'; payload = row; return q },
      update: (patch: Row) => { op = 'update'; payload = patch; return q },
      delete: () => { op = 'delete'; return q },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q },
      in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q },
      order: (c: string) => { orderCol = c; return q },
      limit: (n: number) => { max = n; return q },
      maybeSingle: async () => run(true),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run(false)).then(res, rej),
    }
    return q
  }
  return { getSupabaseAdmin: () => ({ from: builder }), getSupabaseClient: () => ({}) }
})

import { NextRequest } from 'next/server'
import { POST } from '../app/api/paystack-webhook/route'

const SECRET = 'sk_test_unit'
const BASIC = 'PLN_basic'
const PRO = 'PLN_pro'
const TEST = 'PLN_test'
const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const DAY = 24 * 60 * 60 * 1000

function send(event: unknown, opts: { sig?: string | null; raw?: string } = {}) {
  const raw = opts.raw ?? JSON.stringify(event)
  const sig = opts.sig === undefined ? crypto.createHmac('sha512', SECRET).update(raw).digest('hex') : opts.sig
  return POST(new NextRequest('http://localhost/api/paystack-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(sig ? { 'x-paystack-signature': sig } : {}) },
    body: raw,
  }))
}
const charge = (over: Row = {}, data: Row = {}) => ({
  event: 'charge.success',
  data: { reference: 'ref-1', amount: 1_500_000, currency: 'NGN', customer: { email: 'ada@example.com' }, plan: { plan_code: BASIC }, ...over, ...data },
})
const subCreate = (over: Row = {}) => ({
  event: 'subscription.create',
  data: {
    subscription_code: 'SUB_1', customer: { email: 'ada@example.com' }, next_payment_date: new Date(Date.now() + 365 * DAY).toISOString(),
    plan: { plan_code: BASIC, amount: 1_500_000, currency: 'NGN' }, ...over,
  },
})
const refund = (over: Row = {}) => ({ event: 'refund.processed', data: { transaction_reference: 'ref-1', amount: 1_500_000, currency: 'NGN', ...over } })

const user = (id = U1, email = 'ada@example.com', extra: Row = {}) => ({ id, email, slug: `slug-${id.slice(0, 2)}`, plan: 'unpublished', ...extra })
const subs = (id = U1) => h.db.subscriptions.filter((s) => s.user_id === id)

beforeEach(() => {
  h.db = { users: [user(), user(U2, 'bob@example.com')], subscriptions: [], payments: [] }
  h.failures = []; h.emails = []; h.revalidated = []
  process.env.PAYSTACK_SECRET_KEY = SECRET
  process.env.PAYSTACK_BASIC_PLAN_CODE = BASIC
  process.env.PAYSTACK_PRO_PLAN_CODE = PRO
  process.env.PAYSTACK_TEST_PLAN_CODE = TEST
  process.env.PAYSTACK_TEST_EMAIL = 'tester@example.com'
  delete process.env.PAYSTACK_EXPECTED_PRICES
  process.env.PAYSTACK_PRICE_CHECK = 'enforce'
  delete process.env.RESEND_API_KEY
  process.env.RESEND_API_KEY = 'x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('signature and configuration', () => {
  it('400 for a wrong, truncated or missing signature; nothing is written', async () => {
    expect((await send(charge(), { sig: 'deadbeef' })).status).toBe(400)
    expect((await send(charge(), { sig: 'a'.repeat(128) })).status).toBe(400)
    expect((await send(charge(), { sig: null })).status).toBe(400)
    expect(h.db.payments).toHaveLength(0)
    expect(h.db.subscriptions).toHaveLength(0)
  })
  it('a body altered after signing is rejected', async () => {
    const good = JSON.stringify(charge())
    const sig = crypto.createHmac('sha512', SECRET).update(good).digest('hex')
    expect((await send(null, { raw: good.replace('1500000', '1'), sig })).status).toBe(400)
  })
  it('500 and no processing when the secret is not configured', async () => {
    delete process.env.PAYSTACK_SECRET_KEY
    expect((await send(charge(), { sig: 'x' })).status).toBe(500)
    expect(h.db.payments).toHaveLength(0)
  })
})

describe('what is granted', () => {
  it('first payment: basic subscription for a year, plan cache, one payment row, one e-mail', async () => {
    expect((await send(charge())).status).toBe(200)
    expect(h.db.users[0].plan).toBe('basic')
    expect(subs()).toHaveLength(1)
    const exp = new Date(subs()[0].expires_at).getTime() - Date.now()
    expect(exp).toBeGreaterThan(364 * DAY)
    expect(exp).toBeLessThan(366 * DAY)
    expect(h.db.payments).toEqual([expect.objectContaining({ ls_order_id: 'ref-1', product_tier: 'basic', amount_cents: 1_500_000, user_id: U1 })])
    expect(h.emails).toHaveLength(1)
  })

  it('tier comes from the plan code, not from the client-controlled reference', async () => {
    await send(charge({ reference: 'lp-portfolio-pro-123' }))
    expect(h.db.users[0].plan).toBe('basic')
  })

  it.each([
    ['unknown plan code', { plan: { plan_code: 'PLN_other' } }],
    ['no plan (not a plan transaction)', { plan: undefined }],
  ])('%s: 200, nothing written', async (_n, over) => {
    expect((await send(charge(over))).status).toBe(200)
    expect(h.db.payments).toHaveLength(0)
    expect(h.db.users[0].plan).toBe('unpublished')
  })

  it('the test plan only counts for the whitelisted e-mail', async () => {
    await send(charge({ amount: 50_000, plan: { plan_code: TEST } }))
    expect(h.db.payments).toHaveLength(0)
    h.db.users.push(user('33333333-3333-4333-8333-333333333333', 'tester@example.com'))
    await send(charge({ reference: 'ref-t', amount: 50_000, plan: { plan_code: TEST }, customer: { email: 'tester@example.com' } }))
    expect(h.db.payments).toHaveLength(1)
  })

  it('no user for the e-mail: 200 and nothing written', async () => {
    expect((await send(charge({ customer: { email: 'nobody@example.com' } }))).status).toBe(200)
    expect(h.db.payments).toHaveLength(0)
  })
})

describe('amount and currency verification', () => {
  it.each([
    ['amount too low', { amount: 100 }],
    ['amount too high', { amount: 99_999_999 }],
    ['pro price on the basic plan code', { amount: 4_500_000 }],
    ['wrong currency', { currency: 'USD' }],
    ['missing currency', { currency: undefined }],
    ['amount as a string', { amount: '1500000' }],
    ['NaN-ish amount', { amount: null }],
  ])('%s: nothing granted, nothing recorded, 200', async (_n, over) => {
    const res = await send(charge(over))
    expect(res.status).toBe(200)
    expect(h.db.payments).toHaveLength(0)
    expect(h.db.subscriptions).toHaveLength(0)
    expect(h.db.users[0].plan).toBe('unpublished')
    expect(h.emails).toHaveLength(0)
  })

  it('pro costs 45,000 NGN; the same amount on the basic code is refused', async () => {
    await send(charge({ reference: 'ref-p', amount: 4_500_000, plan: { plan_code: PRO } }))
    expect(h.db.users[0].plan).toBe('pro')
  })

  it('a currency listed in PAYSTACK_EXPECTED_PRICES is accepted, an unlisted one is not', async () => {
    process.env.PAYSTACK_EXPECTED_PRICES = JSON.stringify({ basic: [{ currency: 'USD', amount: 1000 }] })
    await send(charge({ currency: 'NGN' }))
    expect(h.db.payments).toHaveLength(0)
    await send(charge({ reference: 'ref-usd', currency: 'usd', amount: 1000 }))
    expect(h.db.users[0].plan).toBe('basic')
  })

  it('invalid PAYSTACK_EXPECTED_PRICES falls back to the defaults', async () => {
    process.env.PAYSTACK_EXPECTED_PRICES = '{not json'
    await send(charge())
    expect(h.db.users[0].plan).toBe('basic')
  })

  it('subscription.create is checked against the plan object too, and a missing price grants nothing', async () => {
    await send(subCreate({ plan: { plan_code: BASIC, amount: 1, currency: 'NGN' } }))
    await send(subCreate({ plan: { plan_code: BASIC } }))
    expect(h.db.payments).toHaveLength(0)
    await send(subCreate())
    expect(h.db.users[0].plan).toBe('basic')
  })
})

describe('price check rollout switch', () => {
  it.each([['unset', undefined], ['log', 'log'], ['empty', '']])('PAYSTACK_PRICE_CHECK %s: a mismatch is logged and the payment is still honoured', async (_n, v) => {
    if (v === undefined) delete process.env.PAYSTACK_PRICE_CHECK; else process.env.PAYSTACK_PRICE_CHECK = v
    const res = await send(charge({ amount: 100, currency: 'USD' }))
    expect(res.status).toBe(200)
    expect(h.db.users[0].plan).toBe('basic')
    expect(h.db.payments).toHaveLength(1)
  })
  it('only the exact value "enforce" rejects', async () => {
    process.env.PAYSTACK_PRICE_CHECK = 'Enforce '
    await send(charge({ amount: 100 }))
    expect(h.db.payments).toHaveLength(1)
    process.env.PAYSTACK_PRICE_CHECK = 'enforce'
    await send(charge({ reference: 'ref-2', amount: 100 }))
    expect(h.db.payments).toHaveLength(1)
  })
})

describe('idempotency', () => {
  it('the same event delivered 3 times: one payment, one subscription, one e-mail, expiry unchanged', async () => {
    await send(charge())
    const expiry = subs()[0].expires_at
    expect((await send(charge())).status).toBe(200)
    expect((await send(charge())).status).toBe(200)
    expect(h.db.payments).toHaveLength(1)
    expect(subs()).toHaveLength(1)
    expect(subs()[0].expires_at).toBe(expiry)
    expect(h.emails).toHaveLength(1)
  })

  it('two simultaneous deliveries: exactly one claims the payment', async () => {
    const [a, b] = await Promise.all([send(charge()), send(charge())])
    expect([a.status, b.status]).toEqual([200, 200])
    expect(h.db.payments).toHaveLength(1)
    expect(subs()).toHaveLength(1)
    expect(h.emails).toHaveLength(1)
  })

  it('charge.success followed by subscription.create for the same purchase does not double the term', async () => {
    await send(charge())
    await send(subCreate())
    expect(subs()).toHaveLength(1)
    expect(new Date(subs()[0].expires_at).getTime() - Date.now()).toBeLessThan(366 * DAY)
    expect(h.emails).toHaveLength(1)
  })
})

describe('renewal, upgrade, cancellation', () => {
  const seedSub = (plan: string, daysLeft: number, status = 'active') =>
    h.db.subscriptions.push({ id: 's1', user_id: U1, plan, status, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + daysLeft * DAY).toISOString() })

  it('renewal inside the 30-day window extends by a year from the old expiry, no second e-mail', async () => {
    seedSub('basic', 10)
    const before = new Date(subs()[0].expires_at).getTime()
    await send(charge({ reference: 'ref-renew' }))
    expect(new Date(subs()[0].expires_at).getTime() - before).toBe(365 * DAY)
    expect(h.emails).toHaveLength(0)
  })

  it('an early echo (200 days left) leaves the date alone', async () => {
    seedSub('basic', 200)
    const before = subs()[0].expires_at
    await send(charge({ reference: 'ref-echo' }))
    expect(subs()[0].expires_at).toBe(before)
  })

  it('an expired subscription renews from now', async () => {
    seedSub('basic', -5, 'cancelled')
    await send(charge({ reference: 'ref-late' }))
    expect(subs()[0].status).toBe('active')
    expect(new Date(subs()[0].expires_at).getTime() - Date.now()).toBeGreaterThan(364 * DAY)
  })

  it('upgrade basic → pro starts a new term from now on the same subscription row', async () => {
    seedSub('basic', 100)
    await send(charge({ reference: 'ref-up', amount: 4_500_000, plan: { plan_code: PRO } }))
    expect(subs()).toHaveLength(1)
    expect(subs()[0].plan).toBe('pro')
    expect(h.db.users[0].plan).toBe('pro')
  })

  it('subscription.disable marks it cancelled and keeps access until expiry', async () => {
    seedSub('basic', 100)
    await send({ event: 'subscription.disable', data: { customer: { email: 'ada@example.com' } } })
    expect(subs()[0].status).toBe('cancelled')
    expect(h.db.users[0].plan).toBe('unpublished') // untouched here; the cron owns downgrades
  })
})

describe('database errors make Paystack retry', () => {
  it('a failure while applying the entitlement: 500, the claim is released, the retry succeeds', async () => {
    h.failures.push({ table: 'subscriptions', op: 'insert' })
    expect((await send(charge())).status).toBe(500)
    expect(h.db.payments).toHaveLength(0)
    expect(h.db.users[0].plan).toBe('unpublished')
    expect((await send(charge())).status).toBe(200)
    expect(h.db.users[0].plan).toBe('basic')
    expect(h.db.payments).toHaveLength(1)
  })

  it('a failure while updating the user row: 500, then the retry converges without double-extending', async () => {
    h.failures.push({ table: 'users', op: 'update' })
    expect((await send(charge())).status).toBe(500)
    const created = subs()[0]
    expect(created).toBeTruthy() // the subscription row did get written before the failure
    expect((await send(charge())).status).toBe(200)
    expect(subs()).toHaveLength(1)
    expect(h.db.users[0].plan).toBe('basic')
    expect(h.db.payments).toHaveLength(1)
  })

  it('a failure to record the payment claim: 500 and nothing granted', async () => {
    h.failures.push({ table: 'payments', op: 'insert' })
    expect((await send(charge())).status).toBe(500)
    expect(h.db.subscriptions).toHaveLength(0)
  })

  it('a failure looking the user up: 500', async () => {
    h.failures.push({ table: 'users', op: 'select' })
    expect((await send(charge())).status).toBe(500)
  })

  it('malformed JSON with a valid signature is acknowledged (a retry could never fix it)', async () => {
    expect((await send(null, { raw: '{oops' })).status).toBe(200)
  })

  it('unknown events are acknowledged', async () => {
    expect((await send({ event: 'transfer.success', data: {} })).status).toBe(200)
  })
})

describe('matching the payer to an account', () => {
  it('uses metadata.user_id when it resolves, even if the payer e-mail is unknown', async () => {
    await send(charge({ customer: { email: 'ada.other@example.com' }, metadata: { user_id: U1 } }))
    expect(h.db.users[0].plan).toBe('basic')
  })

  it('ignores a malformed id and falls back to the e-mail', async () => {
    await send(charge({ metadata: { user_id: "1' or '1'='1" } }))
    expect(h.db.users[0].plan).toBe('basic')
    expect(h.db.users[1].plan).toBe('unpublished')
  })

  it('an id that does not exist falls back to the e-mail', async () => {
    await send(charge({ metadata: { user_id: '99999999-9999-4999-8999-999999999999' } }))
    expect(h.db.users[0].plan).toBe('basic')
  })

  it('id and e-mail belong to different people: may activate an unpaid account', async () => {
    await send(charge({ metadata: { user_id: U2 } })) // payer ada@ pays for bob's account
    expect(h.db.users[1].plan).toBe('basic')
    expect(h.db.users[0].plan).toBe('unpublished')
  })

  it('...but can never replace, extend or downgrade an existing paid subscription', async () => {
    h.db.users[1].plan = 'pro'
    h.db.subscriptions.push({ id: 's9', user_id: U2, plan: 'pro', status: 'active', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 100 * DAY).toISOString() })
    const before = JSON.stringify(h.db.subscriptions)
    expect((await send(charge({ metadata: { user_id: U2 } }))).status).toBe(200)
    expect(JSON.stringify(h.db.subscriptions)).toBe(before)
    expect(h.db.users[1].plan).toBe('pro')
    expect(h.emails).toHaveLength(0)
  })
})

describe('refunds', () => {
  const paid = async () => { await send(charge()); expect(h.db.users[0].plan).toBe('basic') }

  it('a full refund marks the payment, ends the subscription and removes the plan', async () => {
    await paid()
    expect((await send(refund())).status).toBe(200)
    expect(h.db.payments[0].refunded_at).toBeTruthy()
    expect(subs()[0].status).toBe('expired')
    expect(h.db.users[0].plan).toBe('unpublished')
    expect(h.revalidated.length).toBeGreaterThan(0)
  })

  it('a duplicate refund event changes nothing further', async () => {
    await paid()
    await send(refund())
    const stamp = h.db.payments[0].refunded_at
    await send(refund())
    expect(h.db.payments[0].refunded_at).toBe(stamp)
  })

  it('a partial refund is logged and access is NOT revoked', async () => {
    await paid()
    await send(refund({ amount: 500_000 }))
    expect(h.db.users[0].plan).toBe('basic')
    expect(h.db.payments[0].refunded_at).toBeUndefined()
  })

  it('a refund for an unknown reference is acknowledged and changes nothing', async () => {
    await paid()
    expect((await send(refund({ transaction_reference: 'nope' }))).status).toBe(200)
    expect(h.db.users[0].plan).toBe('basic')
  })

  it('a time-boxed (bootcamp/invite) plan that is still running is not removed', async () => {
    await paid()
    h.db.users[0].plan_expires_at = new Date(Date.now() + 30 * DAY).toISOString()
    await send(refund())
    expect(h.db.users[0].plan).toBe('basic')
    expect(subs()[0].status).toBe('expired')
  })

  it('a database failure answers 500 and the retry completes the refund', async () => {
    await paid()
    h.failures.push({ table: 'users', op: 'update' })
    expect((await send(refund())).status).toBe(500)
    expect(h.db.payments[0].refunded_at).toBeUndefined()
    expect((await send(refund())).status).toBe(200)
    expect(h.db.payments[0].refunded_at).toBeTruthy()
    expect(h.db.users[0].plan).toBe('unpublished')
  })

  it('a refund does not need a customer e-mail (not part of the refund payload)', async () => {
    await paid()
    const res = await send({ event: 'refund.processed', data: { transaction_reference: 'ref-1', amount: 1_500_000 } })
    expect(res.status).toBe(200)
    expect(h.db.payments[0].refunded_at).toBeTruthy()
  })
})
