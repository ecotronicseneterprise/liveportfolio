import { onboardingEnabled } from './flag'

/**
 * Where "Make my portfolio" / "Sign up" go. With NEXT_PUBLIC_ONBOARDING_V2=true it is the account-first flow; otherwise the
 * old wizard (so nothing changes until the flag is flipped). The value is fixed at build time like the flag itself.
 * middleware.ts also redirects a direct visit to /create (query string kept) when the flag is on.
 */
export const CREATE_HREF: string = onboardingEnabled() ? '/create/account' : '/create'

/**
 * Where a signed-out visitor to a signed-in page (dashboard, preview) goes. They already have an account (an e-mail link
 * opened in another browser, a cleared session), so it is the SIGN-IN tab, not "make my portfolio". After signing in the
 * flow routes them to wherever they belong: the dashboard when the portfolio exists, the next missing step when not.
 */
export const SIGNIN_HREF: string = onboardingEnabled() ? '/create/account?mode=signin' : '/login'
