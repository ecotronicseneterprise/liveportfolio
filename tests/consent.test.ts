// P4: analytics only after an explicit opt-in; reject as easy as accept; no Meta Pixel; the policy says what is really sent.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CONSENT_KEY, isPortfolioContext, parseConsent, serializeConsent, shouldLoadAnalytics, shouldShowBanner,
} from '../lib/consent'
import { BannerView } from '../components/ConsentBanner'
import PrivacyPage from '../app/privacy/page'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(rel, out) }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel)
  }
  return out
}

const accepted = { v: 1 as const, analytics: true, at: '2026-10-24T10:00:00.000Z' }
const rejected = { v: 1 as const, analytics: false, at: '2026-10-24T10:00:00.000Z' }
const site = { gaId: 'G-TEST', hostname: 'liveportfolio.site', pathname: '/', production: true, rootDomain: 'liveportfolio.site' }

describe('consent record', () => {
  it('round-trips, and anything else is "no decision"', () => {
    expect(parseConsent(serializeConsent(true, new Date('2026-10-24T10:00:00Z')))).toEqual(accepted)
    expect(parseConsent(serializeConsent(false, new Date('2026-10-24T10:00:00Z')))).toEqual(rejected)
    for (const bad of [null, '', 'yes', '{}', '[]', '{"v":2,"analytics":true,"at":"x"}', '{"v":1,"analytics":"true","at":"x"}', '{"v":1,"analytics":true}', '{"v":1,"analytics":true,"at":5}']) {
      expect(parseConsent(bad as string | null), String(bad)).toBeNull()
    }
  })
  it('uses a stable storage key', () => expect(CONSENT_KEY).toBe('lp_consent'))
})

describe('shouldLoadAnalytics: nothing loads before an explicit accept', () => {
  it('no decision, rejected, no GA id, not production: never', () => {
    expect(shouldLoadAnalytics({ ...site, consent: null })).toBe(false)
    expect(shouldLoadAnalytics({ ...site, consent: rejected })).toBe(false)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, gaId: '' })).toBe(false)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, gaId: undefined })).toBe(false)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, production: false })).toBe(false)
  })
  it('accepted on our own pages: yes', () => {
    expect(shouldLoadAnalytics({ ...site, consent: accepted })).toBe(true)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, pathname: '/dashboard' })).toBe(true)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, hostname: 'www.liveportfolio.site' })).toBe(true)
  })
  it('never on a person\'s portfolio (their subdomain or the /portfolio/ path): visitors there are not our visitors', () => {
    expect(shouldLoadAnalytics({ ...site, consent: accepted, hostname: 'ada.liveportfolio.site' })).toBe(false)
    expect(shouldLoadAnalytics({ ...site, consent: accepted, pathname: '/portfolio/ada' })).toBe(false)
    expect(isPortfolioContext('ada.liveportfolio.site', '/portfolio/ada', 'liveportfolio.site')).toBe(true)
    expect(isPortfolioContext('liveportfolio.site', '/', 'liveportfolio.site')).toBe(false)
    expect(isPortfolioContext('www.liveportfolio.site', '/', 'liveportfolio.site')).toBe(false)
    expect(isPortfolioContext('localhost', '/dashboard', 'liveportfolio.site')).toBe(false)
  })
})

describe('shouldShowBanner', () => {
  it('only when there is something to ask: a GA id, no decision yet (or the person reopened it), on our own pages', () => {
    expect(shouldShowBanner({ ...site, consent: null, reopened: false })).toBe(true)
    expect(shouldShowBanner({ ...site, consent: accepted, reopened: false })).toBe(false)
    expect(shouldShowBanner({ ...site, consent: rejected, reopened: false })).toBe(false)
    expect(shouldShowBanner({ ...site, consent: rejected, reopened: true })).toBe(true)
    expect(shouldShowBanner({ ...site, gaId: '', consent: null, reopened: false })).toBe(false)
    expect(shouldShowBanner({ ...site, consent: null, reopened: false, hostname: 'ada.liveportfolio.site' })).toBe(false)
  })
})

describe('the banner', () => {
  const html = renderToStaticMarkup(createElement(BannerView, { onAccept: () => {}, onReject: () => {} }))
  it('is a labelled dialog with both choices, the same size and weight, and a link to the policy', () => {
    expect(html).toContain('role="dialog"')
    const buttons = [...html.matchAll(/<button[^>]*class="([^"]*)"[^>]*>([^<]*)<\/button>/g)]
    const accept = buttons.find((b) => /accept/i.test(b[2]))
    const reject = buttons.find((b) => /reject/i.test(b[2]))
    expect(accept && reject).toBeTruthy()
    expect(accept![1]).toBe(reject![1]) // identical styling: rejecting is exactly as easy as accepting
    expect(accept![1]).toMatch(/min-h-\[44px\]/)
    expect(html).toContain('href="/privacy#cookies"')
  })
  it('renders nothing on the server (the decision is made in the browser, so there is no flash or mismatch)', async () => {
    const mod = await import('../components/ConsentBanner')
    expect(renderToStaticMarkup(createElement(mod.default))).toBe('')
  })
})

describe('no Meta Pixel, and Google only through the consent gate', () => {
  const files = [...walk('app'), ...walk('components'), ...walk('lib')]
  it('no source file references the Meta Pixel', () => {
    const offenders = files.filter((f) => /fbevents|fbq\(|facebook\.com\/tr|connect\.facebook\.net|NEXT_PUBLIC_META_PIXEL_ID/.test(read(f)))
    expect(offenders).toEqual([])
  })
  it('googletagmanager is referenced only by TrackingScripts, which asks shouldLoadAnalytics first', () => {
    const users = files.filter((f) => /googletagmanager\.com/.test(read(f)))
    expect(users).toEqual(['components/TrackingScripts.tsx'])
    expect(read('components/TrackingScripts.tsx')).toMatch(/shouldLoadAnalytics\(/)
  })
  it('the layout mounts the banner', () => expect(read('app/layout.tsx')).toMatch(/ConsentBanner/))
})

describe('the privacy policy says what actually happens', () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage)).replace(/<[^>]+>/g, ' ').replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, ' ')
  it.each([
    'Google Analytics', 'only if you accept', 'IPinfo', 'qrserver', 'OpenAI', 'Supabase', 'Vercel', 'Resend', 'Paystack', 'Cloudflare Turnstile',
  ])('discloses %s', (needle) => expect(html).toContain(needle))
  it('describes what goes to OpenAI for import and for generation, and that the e-mail does not', () => {
    expect(html).toMatch(/import[\s\S]*placeholders/i)
    expect(html).toMatch(/name, job title, location[\s\S]*bio/i)
    expect(html).toMatch(/not your e-?mail/i)
  })
  it('no longer makes claims the code contradicts', () => {
    for (const stale of ['tracking pixels', 'No cookie consent banner is required', 'raw IPs are never stored or shared', 'do not use advertising cookies, tracking pixels']) {
      expect(html.toLowerCase()).not.toContain(stale.toLowerCase())
    }
  })
  it('has a cookies section that can reopen the choice, and is marked for legal review in the source', () => {
    expect(renderToStaticMarkup(createElement(PrivacyPage))).toContain('id="cookies"')
    expect(read('app/privacy/page.tsx')).toMatch(/LEGAL REVIEW/)
  })
})
