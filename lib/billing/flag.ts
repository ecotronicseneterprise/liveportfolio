// CHECKOUT_V2 rollout switch (server side, read at request time; changing it needs a new deployment on Vercel).
//   off    (default, and anything unrecognised): today's plan-code checkout, exactly as before
//   owner  the new one-time checkout for the PAYSTACK_TEST_EMAIL account only
//   on     the new one-time checkout for everyone
export type CheckoutMode = 'off' | 'owner' | 'on'

export const checkoutMode = (raw: string | undefined = process.env.CHECKOUT_V2): CheckoutMode => (raw === 'on' || raw === 'owner' ? raw : 'off')

export function checkoutEnabledFor(
  email: string | null | undefined,
  mode: CheckoutMode = checkoutMode(),
  owner: string | undefined = process.env.PAYSTACK_TEST_EMAIL,
): boolean {
  if (mode === 'on') return true
  if (mode === 'owner') return !!email && !!owner && email.trim().toLowerCase() === owner.trim().toLowerCase()
  return false
}
