// Customer-facing billing copy, chosen by how checkout works RIGHT NOW so it never promises something the live flow does not do.
//   one-time (CHECKOUT_V2=on): one payment for 12 months, no automatic renewal, nothing to cancel
//   subscription (default): the original Paystack plan checkout, which renews yearly until cancelled
// Both promise the same 7-day refund guarantee (app/terms/page.tsx section 6 says the same).
export interface BillingCopy {
  modalFooter: string
  pricingNote: string
  landingNote: string
  faqCancel: string
}

export function billingCopy(oneTime: boolean): BillingCopy {
  return oneTime
    ? {
        modalFooter: 'One payment for 12 months · 7-day refund guarantee',
        pricingNote: 'One payment for 12 months · 7-day refund guarantee · We email you before it ends',
        landingNote: 'Free to build and preview. No credit card needed. Pay once for 12 months, with a 7-day refund guarantee.',
        faqCancel: 'You pay once for 12 months. There is no automatic renewal, and we email you before your plan ends. If you are not happy, ask for a refund within 7 days.',
      }
    : {
        modalFooter: 'Annual billing · 7-day refund guarantee · Cancel anytime',
        pricingNote: 'Annual billing · 7-day refund guarantee · Cancel anytime',
        landingNote: 'Free to build and preview. No credit card needed. 7-day refund guarantee.',
        faqCancel: 'Yes. Plans can be cancelled at any time, and there is a 7-day refund guarantee.',
      }
}
