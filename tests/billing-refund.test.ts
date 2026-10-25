// Self-serve refund (lib/billing/refund.ts) and the upgrade price (lib/billing/upgrade.ts). Paystack and e-mail are stubbed.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })), emailTemplates: {} }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createFakeDb } from './helpers/fake-supabase'
import { REFUND_WINDOW_MS, refundableNow, requestRefund } from '../lib/billing/refund'
import { DAY_MS, UPGRADE_FLOOR_KOBO, daysLeft, isUpgradeAmount, upgradePriceKobo } from '../lib/billing/upgrade'
import { PRICES_KOBO } from '../lib/billing/prices'

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

describe('upgrade price', () => {
  const diff = PRICES_KOBO.pro - PRICES_KOBO.basic
  it('is the full difference on day 365 and never more', () => {
    expect(upgradePriceKobo(365)).toBe(diff)
    expect(upgradePriceKobo(1000)).toBe(diff)
  })
  it('day 0 and day 364 (1 day left) hit the floor', () => {
    expect(upgradePriceKobo(0)).toBe(UPGRADE_FLOOR_KOBO)
    expect(upgradePriceKobo(1)).toBe(UPGRADE_FLOOR_KOBO)
  })
  it('rounds down to a whole N100 (the buyer\'s favour)', () => {
    for (const d of [2, 17, 100, 183, 300, 364]) {
      const p = upgradePriceKobo(d)
      expect(p % 10_000).toBe(0)
      expect(p).toBeLessThanOrEqual(Math.max(UPGRADE_FLOOR_KOBO, (diff * d) / 365))
    }
    expect(upgradePriceKobo(183)).toBe(Math.floor((diff * 183) / 365 / 10_000) * 10_000)
  })
  it('daysLeft counts partial days upwards and clamps', () => {
    expect(daysLeft(iso(NOW + 3 * 3_600_000), NOW)).toBe(1)
    expect(daysLeft(iso(NOW - 1), NOW)).toBe(0)
    expect(daysLeft(iso(NOW + 400 * DAY_MS), NOW)).toBe(365)
    expect(daysLeft(null, NOW)).toBe(0)
  })
  it('recognises an upgrade payment by its amount', () => {
    expect(isUpgradeAmount('pro', 2_000_000)).toBe(true)
    expect(isUpgradeAmount('pro', PRICES_KOBO.pro)).toBe(false)
    expect(isUpgradeAmount('basic', PRICES_KOBO.basic)).toBe(false)
  })
})
