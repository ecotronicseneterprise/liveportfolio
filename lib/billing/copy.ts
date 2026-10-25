// Customer-facing billing copy. There is ONE checkout (lib/billing, /api/checkout): a single payment that gives 12 months, with no
// automatic renewal and a 7-day refund guarantee. app/terms/page.tsx says the same. Keep the three in step.
//
// Not promised, because it is not built: reminder e-mails before a plan ends (design in docs/payment-redesign.md 2.6). Do not add
// such a line here or in the Terms until it ships.
export const BILLING_COPY = {
  modalFooter: 'One payment for 12 months · No automatic renewal · 7-day refund guarantee',
  pricingNote: 'One payment for 12 months · No automatic renewal · 7-day refund guarantee',
  landingNote: 'Free to build and preview. No credit card needed. Pay once for 12 months, with a 7-day refund guarantee.',
  faqCancel: 'There is nothing to cancel. You pay once for 12 months and the plan does not renew automatically; you can renew from your dashboard. If you are not happy, you can request a refund from Plan and billing in your dashboard within 7 days of paying. After 7 days there are no refunds.',
  period: 'for 12 months',
  nairaNote: "You are charged in Naira and your bank converts it at its own rate.",
} as const

/** "₦15,000" from a number of naira. Formatted by hand so server and browser always agree. */
export const formatNaira = (n: number): string => `₦${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
