// Cookie / analytics consent. Pure functions (tested in tests/consent.test.ts); the components only read and write the record.
//
// Rules: analytics (Google Analytics 4) loads ONLY after an explicit "accept". No decision means no. "Reject" is a real choice
// that is remembered and can be changed later ("Cookie settings"). Nothing here concerns the sign-in session, which is strictly
// necessary and is not tracking. The Meta Pixel was removed entirely.
export const CONSENT_KEY = 'lp_consent'
export const CONSENT_EVENT = 'lp:consent' // fired in the same tab after a choice is saved
export const REOPEN_EVENT = 'lp:consent-reopen' // fired by the "Cookie settings" links

export interface Consent {
  v: 1
  analytics: boolean
  at: string
}

export const serializeConsent = (analytics: boolean, now: Date = new Date()): string =>
  JSON.stringify({ v: 1, analytics, at: now.toISOString() } satisfies Consent)

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<Consent> | null
    if (!o || typeof o !== 'object' || o.v !== 1 || typeof o.analytics !== 'boolean' || typeof o.at !== 'string') return null
    return { v: 1, analytics: o.analytics, at: o.at }
  } catch {
    return null
  }
}

/** A person's own portfolio (their subdomain, or the /portfolio/ path): its visitors are not our visitors, so no banner and no analytics there. */
export function isPortfolioContext(hostname: string, pathname: string, rootDomain: string): boolean {
  const host = hostname.toLowerCase()
  const root = rootDomain.toLowerCase()
  if (pathname.startsWith('/portfolio/')) return true
  if (host === root || host === `www.${root}`) return false
  return host.endsWith(`.${root}`)
}

export interface GateInput {
  gaId: string | undefined
  consent: Consent | null
  hostname: string
  pathname: string
  production: boolean
  rootDomain: string
}

export function shouldLoadAnalytics(i: GateInput): boolean {
  if (!i.gaId || !i.production) return false
  if (!i.consent || i.consent.analytics !== true) return false
  return !isPortfolioContext(i.hostname, i.pathname, i.rootDomain)
}

/** Ask only when there is something to consent to (analytics is configured), nothing was decided yet or the person reopened it. */
export function shouldShowBanner(i: Omit<GateInput, 'production'> & { reopened: boolean; production?: boolean }): boolean {
  if (!i.gaId) return false
  if (isPortfolioContext(i.hostname, i.pathname, i.rootDomain)) return false
  return i.reopened || i.consent === null
}

/** Removes Google's cookies and switches its measurement off for this page (used when a person withdraws consent). */
export function revokeAnalytics(gaId: string | undefined): void {
  if (typeof document === 'undefined') return
  if (gaId) (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true
  const names = document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid')
  const hostParts = location.hostname.split('.')
  const domains = new Set<string>([location.hostname])
  for (let i = 1; i < hostParts.length - 1; i++) domains.add(hostParts.slice(i).join('.'))
  for (const n of names) for (const d of domains) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`
}

export function readConsent(): Consent | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY))
  } catch {
    return null
  }
}

export function saveConsent(analytics: boolean): Consent {
  const raw = serializeConsent(analytics)
  try {
    localStorage.setItem(CONSENT_KEY, raw)
  } catch {
    // storage blocked: the choice still applies for this page view
  }
  window.dispatchEvent(new Event(CONSENT_EVENT))
  return parseConsent(raw)!
}
