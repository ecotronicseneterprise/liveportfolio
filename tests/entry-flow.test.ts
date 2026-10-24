// Entry flow: every CTA goes to the account-first flow, the old wizard is unreachable when it is on, no step shows a
// "sign in first" banner (it redirects with the page remembered), every import call is authenticated, the GitHub input is
// normalised, the import step renders four equal blocks, and the support contact no longer floats over the page.
import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { accountUrl, destinationFor, routeFor, STEP_ALLOWS, STEP_PATHS, stepOfPath, type ServerState } from '../lib/onboarding/state'
import { normalizeGithubInput } from '../lib/connectors/safe-url'
import { parseGithubUsername } from '../lib/connectors/github'
import { applyAfterProfile, captureAttribution, INVITED_FLAG, KEYS, readAttribution } from '../lib/onboarding/attribution'
import type { KeyValueStore } from '../lib/onboarding/draft'

const ROOT = path.resolve(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

// ── middleware ───────────────────────────────────────────────────────────────────────────────────────────────
async function mw(flag: 'true' | 'false', url: string, host: string) {
  vi.resetModules()
  process.env.NEXT_PUBLIC_ONBOARDING_V2 = flag
  const { middleware } = await import('../middleware')
  return middleware(new NextRequest(url, { headers: { host } }))
}
describe('/create → /create/account when NEXT_PUBLIC_ONBOARDING_V2=true', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_ONBOARDING_V2 })
  const redirected = (res: Response) => res.status >= 300 && res.status < 400
  it.each([
    ['production', 'https://liveportfolio.site/create', 'liveportfolio.site'],
    ['www', 'https://www.liveportfolio.site/create/', 'www.liveportfolio.site'],
    ['vercel preview', 'https://liveportfolio-git-dev-x.vercel.app/create', 'liveportfolio-git-dev-x.vercel.app'],
    ['localhost', 'http://localhost:3001/create', 'localhost:3001'],
  ])('%s: redirects', async (_n, url, host) => {
    const res = await mw('true', url, host)
    expect(redirected(res)).toBe(true)
    expect(new URL(res.headers.get('location')!).pathname.replace(/\/$/, '')).toBe('/create/account')
  })
  it('keeps the query string (?ref= affiliate, ?invite=, ?bootcamp=, ?name=)', async () => {
    const res = await mw('true', 'https://liveportfolio.site/create?ref=esther&invite=abc12345&free=true&bootcamp=b1&name=My%20School', 'liveportfolio.site')
    const loc = new URL(res.headers.get('location')!)
    expect(loc.pathname).toBe('/create/account')
    expect(loc.searchParams.get('ref')).toBe('esther')
    expect(loc.searchParams.get('invite')).toBe('abc12345')
    expect(loc.searchParams.get('bootcamp')).toBe('b1')
    expect(loc.searchParams.get('name')).toBe('My School')
  })
  it('does not touch the flow itself, other pages, or a user portfolio subdomain', async () => {
    expect(redirected(await mw('true', 'https://liveportfolio.site/create/account', 'liveportfolio.site'))).toBe(false)
    expect(redirected(await mw('true', 'https://liveportfolio.site/dashboard', 'liveportfolio.site'))).toBe(false)
    const sub = await mw('true', 'https://ada.liveportfolio.site/create', 'ada.liveportfolio.site')
    expect(redirected(sub)).toBe(false) // that is ada's own /create path, rewritten to her portfolio
    expect(sub.headers.get('x-middleware-rewrite')).toContain('/portfolio/ada')
  })
  it('flag off: the old wizard stays reachable', async () => {
    expect(redirected(await mw('false', 'https://liveportfolio.site/create', 'liveportfolio.site'))).toBe(false)
  })
})

describe('every CTA points at the flow entry', () => {
  it('no page or component hard-codes href="/create"; they use CREATE_HREF (build-time flag)', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name === '.next') continue
        const full = path.join(dir, name)
        const rel = path.relative(ROOT, full).split(path.sep).join('/')
        if (fs.statSync(full).isDirectory()) { if (rel === 'app/create') continue; walk(full) }
        else if (/\.tsx$/.test(name) && /href="\/create"|router\.(push|replace)\('\/create'\)|`\/create\?/.test(fs.readFileSync(full, 'utf8'))) offenders.push(rel)
      }
    }
    walk(path.join(ROOT, 'app')); walk(path.join(ROOT, 'components'))
    expect(offenders).toEqual([])
    expect(read('lib/onboarding/entry.ts')).toMatch(/onboardingEnabled\(\) \? '\/create\/account' : '\/create'/)
    for (const f of ['app/page.tsx', 'components/PricingSection.tsx', 'components/LandingNav.tsx']) expect(read(f), f).toContain('CREATE_HREF')
  })
  it('invite and bootcamp links land on the flow entry with their parameters', () => {
    expect(read('app/invite/[token]/page.tsx')).toMatch(/\$\{CREATE_HREF\}\?ref=/)
    expect(read('app/bootcamp/[code]/page.tsx')).toMatch(/\$\{CREATE_HREF\}\?bootcamp=/)
  })
})

// ── no "sign in first" banner: redirect with the page remembered ────────────────────────────────────────────────
describe('a step without a session redirects to /create/account and remembers where it was', () => {
  const server = (o: Partial<ServerState> = {}): ServerState => ({ profile: false, slug: null, published: false, portfolioId: null, ...o })
  it('every step except account and verify refuses a signed-out person (so the hook redirects)', () => {
    for (const step of Object.keys(STEP_PATHS) as (keyof typeof STEP_PATHS)[]) {
      const allowsSignedOut = STEP_ALLOWS[step].includes('no_session')
      expect(allowsSignedOut, step).toBe(step === 'account' || step === 'verify')
    }
  })
  it('accountUrl keeps an allow-listed return path; destinationFor honours it only if the state may stay there', () => {
    expect(accountUrl('/create/import')).toBe('/create/account?next=%2Fcreate%2Fimport')
    expect(accountUrl()).toBe('/create/account')
    expect(stepOfPath('/create/import?x=1')).toBe('import')
    expect(stepOfPath('/dashboard')).toBeNull()
    // came from /create/import, signed in with a verified account that has no profile yet: back to import
    expect(destinationFor('no_profile', 'none', server(), { preferred: '/create/import' })).toBe('/create/import')
    // came from /create/generate but has no reviewed draft and no profile: generate is not allowed, use the state route
    expect(destinationFor('no_profile', 'none', server(), { preferred: '/create/generate' })).toBe(routeFor('no_profile', 'none', server()))
    // hostile or unknown next is ignored
    for (const p of ['https://evil.example', '//evil.example', '/api/x', '/dashboard', '', null, undefined]) {
      expect(destinationFor('no_profile', 'none', server(), { preferred: p })).toBe('/create/import')
    }
  })
  it('the hook sends a signed-out visitor to accountUrl(current page); no component renders a "sign in first" banner', () => {
    expect(read('lib/onboarding/use-flow.ts')).toMatch(/accountUrl\(window\.location\.pathname\)/)
    for (const f of fs.readdirSync(path.join(ROOT, 'components/onboarding'))) {
      expect(read(`components/onboarding/${f}`), f).not.toMatch(/sign in first|errors\.unauthorized/i)
    }
    expect(read('messages/en.json')).not.toMatch(/sign in first/i)
  })
})

// ── authenticated import calls ──────────────────────────────────────────────────────────────────────────────────
describe('every network call in the flow that needs a login carries the Bearer token', () => {
  const PUBLIC_ENDPOINTS = ['/api/check-slug']
  it('each fetch( in components/onboarding and the attribution helper names an Authorization header (public endpoints excepted)', () => {
    const files = [...fs.readdirSync(path.join(ROOT, 'components/onboarding')).map((f) => `components/onboarding/${f}`), 'lib/onboarding/attribution.ts']
    let seen = 0
    const missing: string[] = []
    for (const f of files) {
      const src = read(f)
      for (const m of src.matchAll(/\bfetch(?:Impl)?\(/g)) {
        const win = src.slice(m.index!, m.index! + 420)
        if (PUBLIC_ENDPOINTS.some((e) => win.includes(e))) continue
        seen++
        // either the header is written in the call, or the call passes a `headers` variable that this file builds with the token
        const ok = src.includes('Authorization') && /Authorization|headers/.test(win)
        if (!ok) missing.push(`${f}@${m.index}`)
      }
    }
    expect(seen).toBeGreaterThanOrEqual(6)
    expect(missing).toEqual([])
  })
  it('the import step posts to parse-cv / import with the token and normalises the GitHub input first', () => {
    const src = read('components/onboarding/ImportStep.tsx')
    expect(src).toMatch(/fetch\(url, \{ method: 'POST', body: fd, headers: \{ Authorization: `Bearer \$\{token\}` \} \}\)/)
    expect(src).toMatch(/normalizeGithubInput\(github\)/)
    expect(src).toMatch(/res\.status === 401\) return void router\.replace\(accountUrl/)
  })
})

// ── GitHub input ────────────────────────────────────────────────────────────────────────────────────────────────
describe('normalizeGithubInput', () => {
  it.each([
    ['octocat', 'octocat'], ['  octocat  ', 'octocat'], ['@octocat', 'octocat'], ['github.com/octocat', 'octocat'],
    ['www.github.com/octocat', 'octocat'], ['https://github.com/octocat', 'octocat'], ['http://github.com/octocat/', 'octocat'],
    ['https://github.com/octocat/hello-world', 'octocat'], ['https://github.com/octocat?tab=repositories', 'octocat'],
    ['HTTPS://GitHub.com/Octo-Cat', 'Octo-Cat'], ['a', 'a'],
  ])('%j → %s', (input, out) => expect(normalizeGithubInput(input)).toBe(out))
  it.each([
    '', ' ', 'https://github.com/', 'https://github.com.evil.example/octocat', 'https://evil.example/github.com/octocat', 'https://gitlab.com/octocat',
    '../etc', 'a/b', 'a b', '-a', 'a-', 'a--b', 'x'.repeat(40), 'https://github.com/-bad', '<script>', 'octocat;rm', null, undefined, 5, {},
  ])('rejects %j', (input) => expect(normalizeGithubInput(input as never)).toBeNull())
  it('the connector parses exactly the same way (one parser)', () => {
    for (const s of ['octocat', '@octocat', 'github.com/octocat', 'https://github.com/octocat/x', 'bad name!', '-lead']) {
      expect(parseGithubUsername(s)).toBe(normalizeGithubInput(s))
    }
  })
})

// ── affiliate / invite / bootcamp ───────────────────────────────────────────────────────────────────────────────
describe('attribution carried over from the old wizard', () => {
  const NOW = 1_800_000_000_000
  it('captures ref, invite and bootcamp from the redirected URL with the same keys and expiries', () => {
    const s = memory()
    captureAttribution('?ref=Esther&invite=' + 'a'.repeat(64) + '&free=true&bootcamp=Lagos-Bootcamp&name=Lagos%20School', s, NOW)
    expect(JSON.parse(s.data.get(KEYS.referral)!)).toEqual({ partner: 'esther', expires: NOW + 90 * 86400000 })
    expect(JSON.parse(s.data.get(KEYS.invite)!)).toEqual({ token: 'a'.repeat(64), free_pro: true, expires: NOW + 86400000 })
    expect(JSON.parse(s.data.get(KEYS.bootcamp)!)).toEqual({ code: 'lagos-bootcamp', name: 'Lagos School', expires: NOW + 90 * 86400000 })
    const a = readAttribution(s, NOW + 1000)
    expect(a.referral).toBe('esther')
    expect(a.invite).toEqual({ token: 'a'.repeat(64), freePro: true })
    expect(a.bootcamp).toEqual({ code: 'lagos-bootcamp', name: 'Lagos School' })
  })
  it('first touch wins for referral and bootcamp; expired values are replaced', () => {
    const s = memory()
    captureAttribution('?ref=esther&bootcamp=one', s, NOW)
    captureAttribution('?ref=pelumi&bootcamp=two', s, NOW + 1000)
    expect(readAttribution(s, NOW + 2000)).toMatchObject({ referral: 'esther', bootcamp: { code: 'one' } })
    captureAttribution('?ref=pelumi&bootcamp=two', s, NOW + 91 * 86400000)
    expect(readAttribution(s, NOW + 91 * 86400000 + 1)).toMatchObject({ referral: 'pelumi', bootcamp: { code: 'two' } })
    expect(readAttribution(s, NOW + 400 * 86400000)).toEqual({ referral: null, invite: null, bootcamp: null })
  })
  it('hostile values from a URL are never stored', () => {
    const s = memory()
    captureAttribution('?ref=' + encodeURIComponent('<script>') + '&invite=short&bootcamp=' + encodeURIComponent('../x') + '&name=' + encodeURIComponent('<b>x</b>'), s, NOW)
    expect([...s.data.keys()]).toEqual([])
    captureAttribution('?bootcamp=ok&name=' + encodeURIComponent('<b>Evil</b> \u0000School'), s, NOW)
    expect(JSON.parse(s.data.get(KEYS.bootcamp)!).name).not.toMatch(/[<>\u0000]/)
    s.data.set(KEYS.referral, '{not json')
    expect(readAttribution(s, NOW).referral).toBeNull()
  })
  it('after the users row exists: invite consumed and bootcamp redeemed with the Bearer token, then everything cleared', async () => {
    const s = memory(); const session = { setItem: vi.fn() }
    captureAttribution('?ref=esther&invite=' + 'b'.repeat(64) + '&free=true&bootcamp=b1', s, NOW)
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(url.includes('invite') ? { upgraded: true } : { ok: true }), { status: 200 })
    }) as typeof fetch
    const r = await applyAfterProfile(fakeFetch, 'tok', 'user-1', s, session, NOW + 5)
    expect(r).toEqual({ inviteUpgraded: true })
    expect(calls.map((c) => c.url)).toEqual(['/api/admin/invite/consume', '/api/bootcamp/redeem'])
    for (const c of calls) expect((c.init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ token: 'b'.repeat(64), user_id: 'user-1' })
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ code: 'b1' })
    expect([...s.data.keys()]).toEqual([])
    expect(session.setItem).toHaveBeenCalledWith(INVITED_FLAG, '1')
  })
  it('a failing invite or bootcamp call never throws and never blocks the flow', async () => {
    const s = memory()
    captureAttribution('?invite=' + 'c'.repeat(64) + '&bootcamp=b1', s, NOW)
    const boom = (async () => { throw new TypeError('offline') }) as unknown as typeof fetch
    await expect(applyAfterProfile(boom, 'tok', 'u', s, null, NOW + 5)).resolves.toEqual({ inviteUpgraded: false })
  })
  it('the address step sends the referral to the profile route and applies the rest only on first creation', () => {
    const src = read('components/onboarding/AddressStep.tsx')
    expect(src).toMatch(/referral_code: referral/)
    expect(src).toMatch(/if \(!hasProfile\) await applyAfterProfile\(/)
    expect(read('components/onboarding/AccountStep.tsx')).toMatch(/captureAttribution\(window\.location\.search/)
  })
})

// ── the import step: four equal blocks ──────────────────────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }))
vi.mock('../lib/onboarding/use-flow', () => ({
  useFlow: () => ({ loading: false, provider: { social: false, name: '', githubLogin: '' }, draft: null, saveDraft: () => {}, getToken: async () => null }),
}))
async function renderImport(flag: string) {
  vi.resetModules()
  process.env.NEXT_PUBLIC_IMPORT_ENABLED = flag
  const mod = await import('../components/onboarding/ImportStep')
  return renderToStaticMarkup(createElement(mod.default))
}
describe('import step: 2 x 2 blocks', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_IMPORT_ENABLED })
  it('flag on: four buttons in a two-column grid, identical card classes, one "Recommended" label (on Upload CV)', async () => {
    const html = await renderImport('true')
    const grid = /<div class="grid grid-cols-2 gap-3"[^>]*>([\s\S]*?)<\/div><div class="mt-4">/.exec(html)
    expect(grid, 'grid not found').toBeTruthy()
    const buttons = [...grid![1].matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    expect(buttons).toHaveLength(4)
    const classes = buttons.map((b) => /class="([^"]*)"/.exec(b[1])![1])
    expect(new Set(classes).size).toBe(1)
    const text = buttons.map((b) => b[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    expect(text[0]).toContain('Upload a CV')
    expect(text[1]).toContain('GitHub')
    expect(text[2]).toContain('Paste text')
    expect(text[3]).toContain('Fill in manually')
    expect(html.match(/Recommended/g)).toHaveLength(1)
    expect(text[0]).toContain('Recommended')
  })
  it('no "Or start from" row, the notice sits below the grid, and no "start blank" link', async () => {
    const html = await renderImport('true')
    expect(html).not.toMatch(/Or start from|Start blank/i)
    expect(html.indexOf('we send it to OpenAI')).toBeGreaterThan(html.indexOf('Fill in manually'))
  })
  it('flag off: only Upload CV and Fill in manually (GitHub and paste need the import flag)', async () => {
    const html = await renderImport('false')
    expect(html).toContain('Upload a CV')
    expect(html).toContain('Fill in manually')
    expect(html).not.toContain('GitHub username')
    expect(html).not.toContain('Paste text')
  })
})

// ── support contact ─────────────────────────────────────────────────────────────────────────────────────────────
describe('support contact', () => {
  it('the floating, draggable chat button is gone; WhatsApp is a plain icon link beside the e-mail', () => {
    expect(fs.existsSync(path.join(ROOT, 'components/SupportButton.tsx'))).toBe(false)
    for (const f of ['app/page.tsx', 'app/cv-to-portfolio/page.tsx', 'app/free-portfolio-website/page.tsx', 'app/portfolio-builder/page.tsx', 'app/what-is-a-portfolio/page.tsx']) {
      const src = read(f)
      expect(src, f).not.toContain('SupportButton')
      expect(src, f).toContain('<ContactLinks />')
    }
    const c = read('components/ContactLinks.tsx')
    expect(c).toMatch(/https:\/\/wa\.me\/2349014545622\?text=/)
    expect(c).toMatch(/aria-label="Chat with us on WhatsApp"/)
    expect(c).toMatch(/mailto:/)
    expect(c.replace(/\/\/.*$/gm, '')).not.toMatch(/position|fixed|innerWidth|animate|animation|'use client'/)
  })
})
