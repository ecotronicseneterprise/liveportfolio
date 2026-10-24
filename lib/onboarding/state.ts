import { safeNext } from './safe-next'

// Where a person belongs in the onboarding flow. Pure: the server (/api/account/state) and the browser session are the
// inputs; the wizard never decides this from its own React state.

export type AccountState = 'no_session' | 'unverified' | 'no_profile' | 'no_portfolio' | 'ready'
export type DraftStatus = 'none' | 'imported' | 'reviewed'

export interface SessionInfo {
  emailVerified: boolean
}

export interface ServerState {
  profile: boolean
  slug: string | null
  published: boolean
  portfolioId: string | null
}

export function resolveState(session: SessionInfo | null, server: ServerState | null): AccountState {
  if (!session) return 'no_session'
  if (!session.emailVerified) return 'unverified'
  if (!server || !server.profile) return 'no_profile'
  if (!server.portfolioId) return 'no_portfolio'
  return 'ready'
}

export const STEP_PATHS = {
  account: '/create/account',
  verify: '/create/verify',
  import: '/create/import',
  review: '/create/review',
  address: '/create/address',
  generate: '/create/generate',
} as const

/** The account step, remembering where the person was (an allow-listed path, applied after sign-in if the state allows it). */
export const accountUrl = (from?: string): string => (from ? `${STEP_PATHS.account}?next=${encodeURIComponent(from)}` : STEP_PATHS.account)

/** The step a path belongs to, if it is one of the flow's steps. */
export const stepOfPath = (p: string): keyof typeof STEP_PATHS | null =>
  (Object.entries(STEP_PATHS).find(([, v]) => v === p.split(/[?#]/, 1)[0])?.[0] as keyof typeof STEP_PATHS | undefined) ?? null

/** The one correct route for this person right now. */
export function routeFor(state: AccountState, draft: DraftStatus, server?: ServerState | null, opts: { social?: boolean } = {}): string {
  switch (state) {
    case 'no_session':
      return STEP_PATHS.account
    case 'unverified':
      return STEP_PATHS.verify
    case 'no_profile':
      // no users row yet: collect and review the content, then choose the address.
      // A social sign-in has no content to collect yet but does have a name, so it starts at the address step.
      if (draft === 'none' && opts.social) return STEP_PATHS.address
      return draft === 'none' ? STEP_PATHS.import : draft === 'imported' ? STEP_PATHS.review : STEP_PATHS.address
    case 'no_portfolio':
      // users row exists (address chosen): content, then generate
      return draft === 'none' ? STEP_PATHS.import : draft === 'imported' ? STEP_PATHS.review : STEP_PATHS.generate
    case 'ready':
      return server?.portfolioId ? `/preview/${server.portfolioId}` : '/dashboard'
  }
}

/**
 * Where to go next: a remembered page (?next=) wins when it is one of the flow's steps AND the person's state may stay on it;
 * otherwise the one correct route for the state. A hostile or unknown ?next= is ignored.
 */
export function destinationFor(
  state: AccountState, draft: DraftStatus, server: ServerState | null | undefined, opts: { social?: boolean; preferred?: string | null } = {},
): string {
  const want = opts.preferred ? safeNext(opts.preferred, '') : ''
  const step = want ? stepOfPath(want) : null
  if (step && STEP_ALLOWS[step].includes(state)) return want
  return routeFor(state, draft, server, { social: opts.social })
}

/** Which states may stay on which step (anything else is redirected to routeFor). */
export const STEP_ALLOWS: Record<keyof typeof STEP_PATHS, AccountState[]> = {
  account: ['no_session'],
  verify: ['unverified', 'no_session'], // with Confirm email ON a new sign-up has NO session until the code is entered
  import: ['no_profile', 'no_portfolio'],
  review: ['no_profile', 'no_portfolio'],
  address: ['no_profile', 'no_portfolio'], // no_portfolio: the address may still be changed before publishing
  generate: ['no_portfolio'],
}
