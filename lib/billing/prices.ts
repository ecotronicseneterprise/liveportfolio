// The server owns the price. The client sends a tier name and nothing else; the amount, currency and what the tier grants come from here.
// Amounts are in kobo (the smallest unit), exactly as Paystack sends and expects them. tests/billing-checkout.test.ts asserts these
// agree with the display prices in lib/plans.ts.
export type Tier = 'basic' | 'pro' | 'test'

export const PRICES_KOBO: Record<Tier, number> = {
  basic: 1_500_000, // ₦15,000
  pro: 4_500_000, // ₦45,000
  test: 50_000, // ₦500, owner only (PAYSTACK_TEST_EMAIL)
}
export const CURRENCY = 'NGN'

export const isTier = (v: unknown): v is Tier => v === 'basic' || v === 'pro' || v === 'test'

/** What a tier grants. The owner-only test tier grants Basic, so the Free-to-Basic change can be seen and then refunded. */
export const planForTier = (t: Tier): 'basic' | 'pro' => (t === 'pro' ? 'pro' : 'basic')
