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

/** The one correct route for this person right now. */
export function routeFor(state: AccountState, draft: DraftStatus, server?: ServerState | null): string {
  switch (state) {
    case 'no_session':
      return STEP_PATHS.account
    case 'unverified':
      return STEP_PATHS.verify
    case 'no_profile':
      // no users row yet: collect and review the content, then choose the address
      return draft === 'none' ? STEP_PATHS.import : draft === 'imported' ? STEP_PATHS.review : STEP_PATHS.address
    case 'no_portfolio':
      // users row exists (address chosen): content, then generate
      return draft === 'none' ? STEP_PATHS.import : draft === 'imported' ? STEP_PATHS.review : STEP_PATHS.generate
    case 'ready':
      return server?.portfolioId ? `/preview/${server.portfolioId}` : '/dashboard'
  }
}

/** Which states may stay on which step (anything else is redirected to routeFor). */
export const STEP_ALLOWS: Record<keyof typeof STEP_PATHS, AccountState[]> = {
  account: ['no_session'],
  verify: ['unverified'],
  import: ['no_profile', 'no_portfolio'],
  review: ['no_profile', 'no_portfolio'],
  address: ['no_profile', 'no_portfolio'], // no_portfolio: the address may still be changed before publishing
  generate: ['no_portfolio'],
}
