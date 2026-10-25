// Self-serve refund (lib/billing/refund.ts) and the upgrade price (lib/billing/upgrade.ts). Paystack and e-mail are stubbed.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })), emailTemplates: {} }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createFakeDb } from './helpers/fake-supabase'
import { REFUND_WINDOW_MS, refundableNow, requestRefund, submitRefundRequest } from '../lib/billing/refund'
import { DAY_MS } from '../lib/billing/upgrade'

const NOW = Date.UTC(2026, 9, 25, 12, 0, 0)
const iso = (t: number) => new Date(t).toISOString()

function seed(opts: { paidAgoMs?: number; ref?: string; refunded?: boolean; intentStatus?: string } = {}) {
  const ctx = createFakeDb()
  const ref = opts.ref ?? 'lpi_abc'
  ctx.db.users = [{ id: 'u1', email: 'a@example.com', slug: 'ada', plan: 'basic' }]
  ctx.db.payments = [{ id: 'p1', user_id: 'u1', ls_order_id: ref, product_tier: 'basic', amount_cents: 1_500_000, created_at: iso(NOW - (opts.paidAgoMs ?? DAY_MS)), refunded_at: opts.refunded ? iso(NOW - 1000) : null }]
  ctx.db.payment_intents = [{ id: 'i1', user_id: 'u1', reference: ref, status: opts.intentStatus ?? 'paid' }]
  ctx.db.subscriptions = [{ id: 's1', user_id: 'u1', plan: 'basic', status: 'active', expires_at: iso(NOW + 300 * DAY_MS), created_at: iso(NOW - DAY_MS) }]
  return ctx
}
const deps = (ok = true) => ({ refund: vi.fn(async () => ({ ok })), notifyOwner: vi.fn(async () => {}), now: () => NOW })

describe('refund window', () => {
  it('refunds at exactly 7 days and refuses 1 second later', async () => {
    const a = seed({ paidAgoMs: REFUND_WINDOW_MS })
    expect((await requestRefund(a.admin as never, 'u1', deps())).outcome).toBe('refunded')
    const b = seed({ paidAgoMs: REFUND_WINDOW_MS + 1000 })
    const d = deps()
    expect((await requestRefund(b.admin as never, 'u1', d)).outcome).toBe('window_closed')
    expect(d.refund).not.toHaveBeenCalled()
  })

  it('refundableNow agrees with the same boundary', async () => {
    expect((await refundableNow(seed({ paidAgoMs: REFUND_WINDOW_MS }).admin as never, 'u1', NOW)).eligible).toBe(true)
    expect((await refundableNow(seed({ paidAgoMs: REFUND_WINDOW_MS + 1000 }).admin as never, 'u1', NOW)).eligible).toBe(false)
  })
})

describe('refund', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks Paystack for the stored reference only, ends access, marks the payment', async () => {
    const ctx = seed()
    const d = deps()
    expect((await requestRefund(ctx.admin as never, 'u1', d)).outcome).toBe('refunded')
    expect(d.refund).toHaveBeenCalledTimes(1)
    expect(d.refund).toHaveBeenCalledWith('lpi_abc')
    expect(ctx.db.users[0].plan).toBe('unpublished')
    expect(ctx.db.subscriptions[0].status).toBe('expired')
    expect(ctx.db.payments[0].refunded_at).toBeTruthy()
    expect(ctx.db.payment_intents[0].status).toBe('refunded')
  })

  it('a double click or two tabs make one Paystack call', async () => {
    const ctx = seed()
    const d = deps()
    const r = await Promise.all([requestRefund(ctx.admin as never, 'u1', d), requestRefund(ctx.admin as never, 'u1', d)])
    expect(d.refund).toHaveBeenCalledTimes(1)
    expect(r.map((x) => x.outcome).sort()).toEqual(['already_refunded', 'refunded'])
  })

  it('rejects someone else, a payment already refunded, and a person with no payment', async () => {
    const d = deps()
    expect((await requestRefund(seed().admin as never, 'u2', d)).outcome).toBe('no_payment')
    expect((await requestRefund(seed({ refunded: true }).admin as never, 'u1', d)).outcome).toBe('already_refunded')
    expect(d.refund).not.toHaveBeenCalled()
  })

  it('does not touch a payment made outside the one-time checkout', async () => {
    const d = deps()
    expect((await requestRefund(seed({ ref: 'manual-20261001-ab' }).admin as never, 'u1', d)).outcome).toBe('not_refundable')
    expect(d.refund).not.toHaveBeenCalled()
  })

  it('when Paystack refuses: no success claim, access kept, claim released, owner told', async () => {
    const ctx = seed()
    const d = deps(false)
    expect((await requestRefund(ctx.admin as never, 'u1', d)).outcome).toBe('pending_manual')
    expect(ctx.db.users[0].plan).toBe('basic')
    expect(ctx.db.payments[0].refunded_at).toBeNull()
    expect(ctx.db.payment_intents[0].status).toBe('paid')
    expect(d.notifyOwner).toHaveBeenCalledTimes(1)
    const [, html] = (d.notifyOwner.mock.calls[0] as unknown) as [string, string]
    expect(html).toContain('lpi_abc')
    expect(html).not.toContain('a@example.com')
  })

  it('if the intents table is missing, nothing is refunded', async () => {
    const ctx = seed()
    ctx.missing.add('payment_intents')
    const d = deps()
    expect((await requestRefund(ctx.admin as never, 'u1', d)).outcome).toBe('unavailable')
    expect(d.refund).not.toHaveBeenCalled()
  })

  it('if ending access fails after Paystack accepted, refunded_at stays empty so the webhook finishes it', async () => {
    const ctx = seed()
    ctx.failures.push({ table: 'subscriptions', op: 'update' })
    expect((await requestRefund(ctx.admin as never, 'u1', deps())).outcome).toBe('refunded')
    expect(ctx.db.payments[0].refunded_at).toBeNull()
  })
})

describe('refund request (the gate: it only e-mails the owner)', () => {
  const ask = async (ctx: ReturnType<typeof seed>, uid = 'u1') => {
    const notifyOwner = vi.fn(async (_s: string, _h: string) => {})
    const r = await submitRefundRequest(ctx.admin as never, uid, { notifyOwner, now: () => NOW })
    return { ...r, notifyOwner }
  }
  it('inside 7 days: e-mails the owner the reference, plan and amount, and changes nothing', async () => {
    const ctx = seed()
    const r = await ask(ctx)
    expect(r.outcome).toBe('requested')
    expect(r.notifyOwner).toHaveBeenCalledTimes(1)
    const [subject, html] = r.notifyOwner.mock.calls[0]
    expect(subject).toMatch(/Refund request/)
    expect(html).toContain('lpi_abc'); expect(html).toContain('1500000'); expect(html).toContain('a@example.com')
    expect(ctx.db.users[0].plan).toBe('basic')
    expect(ctx.db.payments[0].refunded_at).toBeNull()
    expect(ctx.db.payment_intents[0].status).toBe('paid')
  })
  it('exactly 7 days is accepted, 7 days and 1 second is not, and nothing is sent then', async () => {
    expect((await ask(seed({ paidAgoMs: REFUND_WINDOW_MS }))).outcome).toBe('requested')
    const late = await ask(seed({ paidAgoMs: REFUND_WINDOW_MS + 1000 }))
    expect(late.outcome).toBe('window_closed'); expect(late.notifyOwner).not.toHaveBeenCalled()
  })
  it('refuses another account and an already refunded payment', async () => {
    const other = await ask(seed(), 'u2')
    expect(other.outcome).toBe('no_payment'); expect(other.notifyOwner).not.toHaveBeenCalled()
    const done = await ask(seed({ refunded: true }))
    expect(done.outcome).toBe('already_refunded'); expect(done.notifyOwner).not.toHaveBeenCalled()
  })
  it('the e-mail escapes what it includes', async () => {
    const ctx = seed()
    ctx.db.users[0].email = '<b>x</b>@example.com'
    const r = await ask(ctx)
    expect(r.notifyOwner.mock.calls[0][1]).not.toContain('<b>x</b>')
  })
})
