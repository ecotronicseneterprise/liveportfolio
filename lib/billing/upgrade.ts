// Upgrade price: what a Basic owner pays to move to Pro for a new 12-month term. Server only decides it (the checkout never takes an
// amount from the browser). Rule: (Pro price - Basic price) x days left on the Basic plan / 365, rounded DOWN to a whole N100 (the
// buyer's favour; the brief said both "up" and "in the buyer's favour", and the buyer-favouring reading is the safer one), with a floor so
// the last days are not free, and never more than the difference between the two prices.
import { PRICES_KOBO } from './prices'

export const DAY_MS = 86_400_000
export const UPGRADE_FLOOR_KOBO = 100_000 // N1,000
const STEP_KOBO = 10_000 // N100

/** Whole days left, counted upwards (a plan with 3 hours left has 1 day left), clamped to 0..365. */
export function daysLeft(expiresAt: string | Date | null | undefined, now: number = Date.now()): number {
  if (!expiresAt) return 0
  const t = new Date(expiresAt).getTime()
  if (!Number.isFinite(t) || t <= now) return 0
  return Math.min(365, Math.ceil((t - now) / DAY_MS))
}

export function upgradePriceKobo(daysRemaining: number): number {
  const diff = PRICES_KOBO.pro - PRICES_KOBO.basic
  const d = Math.max(0, Math.min(365, Math.floor(daysRemaining)))
  const raw = (diff * d) / 365
  const rounded = Math.floor(raw / STEP_KOBO) * STEP_KOBO
  return Math.min(diff, Math.max(UPGRADE_FLOOR_KOBO, rounded))
}

/** True for a Pro payment that was an upgrade (it cost less than the Pro price). */
export const isUpgradeAmount = (tier: string, amountKobo: number): boolean => tier === 'pro' && amountKobo < PRICES_KOBO.pro
