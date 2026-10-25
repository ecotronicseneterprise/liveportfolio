// Pure parts of the onboarding flow: state routing, safe redirects, slug helpers, the draft, generate retries.
import { describe, expect, it, vi } from 'vitest'
import { resolveState, routeFor, STEP_ALLOWS, STEP_PATHS, type AccountState, type DraftStatus, type ServerState } from '../lib/onboarding/state'
import { safeNext } from '../lib/onboarding/safe-next'
import { slugFromName, slugSuggestions } from '../lib/onboarding/slugify'
import { SLUG_RE } from '../lib/slug'
import {
  createDraftStore, draftFromImport, DRAFT_KEY, sanitizeDraft, signOutAndClear, type Draft, type KeyValueStore,
} from '../lib/onboarding/draft'
import { draftToGeneratePayload, generateWithRetry } from '../lib/onboarding/generate'
import { t } from '../lib/onboarding/t'

const srv = (o: Partial<ServerState> = {}): ServerState => ({ profile: false, slug: null, published: false, portfolioId: null, ...o })

describe('resolveState / routeFor', () => {
  it('maps session + server facts to a state', () => {
    expect(resolveState(null, null)).toBe('no_session')
    expect(resolveState({ emailVerified: false }, null)).toBe('unverified')
    expect(resolveState({ emailVerified: true }, srv())).toBe('no_profile')
    expect(resolveState({ emailVerified: true }, null)).toBe('no_profile')
    expect(resolveState({ emailVerified: true }, srv({ profile: true }))).toBe('no_portfolio')
    expect(resolveState({ emailVerified: true }, srv({ profile: true, portfolioId: 'p1' }))).toBe('ready')
  })

  it('signed in but no users row: goes to import/review/address, never to a page that assumes the row', () => {
    expect(routeFor('no_profile', 'none')).toBe('/create/import')
    expect(routeFor('no_profile', 'imported')).toBe('/create/review')
    expect(routeFor('no_profile', 'reviewed')).toBe('/create/address')
  })
  it('profile but no portfolio: generate only with a reviewed draft', () => {
    expect(routeFor('no_portfolio', 'none')).toBe('/create/import')
    expect(routeFor('no_portfolio', 'imported')).toBe('/create/review')
    expect(routeFor('no_portfolio', 'reviewed')).toBe('/create/generate')
  })
  it('ready always goes to the dashboard (with or without a portfolio id)', () => {
    expect(routeFor('ready', 'none', srv({ profile: true, portfolioId: 'p9' }))).toBe('/dashboard')
    expect(routeFor('ready', 'none', srv({ profile: true }))).toBe('/dashboard')
  })

  it('invariant: the route chosen for any state is a step that accepts that state (no redirect loops)', () => {
    const states: AccountState[] = ['no_session', 'unverified', 'no_profile', 'no_portfolio', 'ready']
    const drafts: DraftStatus[] = ['none', 'imported', 'reviewed']
    const byPath = Object.fromEntries(Object.entries(STEP_PATHS).map(([k, v]) => [v, k])) as Record<string, keyof typeof STEP_PATHS>
    for (const s of states) for (const d of drafts) {
      const path = routeFor(s, d, srv({ profile: true, portfolioId: 'p' }))
      const step = byPath[path]
      if (step) expect(STEP_ALLOWS[step], `${s}/${d} -> ${path}`).toContain(s)
    }
  })
})

describe('safeNext', () => {
  it.each(['/create', '/create/import', '/dashboard', '/preview/abc', '/reset-password?recovery=1', '/create?x=1#y'])('allows %s', (v) => {
    expect(safeNext(v)).toBe(v)
  })
  it.each([
    'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/create/../../etc', '/%2e%2e/admin', '/api/account/profile',
    '/login', '/ create', '/create\n/x', '/create%00', 'create', '', undefined, null, 5, '/' + 'a'.repeat(400), '/%2F%2Fevil.example', '/create/%5Cevil',
  ])('rejects %j', (v) => {
    expect(safeNext(v, '/fallback')).toBe('/fallback')
  })
})

describe('slugFromName / slugSuggestions', () => {
  it('builds a valid slug from a name', () => {
    expect(slugFromName('Ada Okonkwo')).toBe('ada-okonkwo')
    expect(slugFromName('  José  Ñandú-Peña ')).toBe('jose-nandu-pena')
    expect(slugFromName('A'.repeat(60))).toMatch(SLUG_RE)
  })
  it('falls back to me-xxxx when nothing Latin is left or it is too short', () => {
    expect(slugFromName('李小龍', () => 0.5)).toMatch(/^me-[a-z0-9]{4}$/)
    expect(slugFromName('Al', () => 0.1)).toMatch(/^me-/)
    expect(slugFromName('', () => 0.2)).toMatch(SLUG_RE)
  })
  it('suggestions are always valid in shape and avoid taken ones', () => {
    for (const base of ['ada', 'a'.repeat(30), 'ada-okonkwo-engineering-lead']) {
      for (const s of slugSuggestions(base)) expect(s).toMatch(SLUG_RE)
    }
    expect(slugSuggestions('ada', new Set(['ada-1']))).not.toContain('ada-1')
  })
})

describe('draft: stores only reviewed fields', () => {
  const memory = (): KeyValueStore & { data: Map<string, string> } => {
    const data = new Map<string, string>()
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
  }

  it('drops every key that is not an allowed field (raw CV text, e-mail, tokens, passwords)', () => {
    const d = sanitizeDraft({
      name: 'Ada', role: 'Engineer', rawText: 'THE WHOLE CV', text: 'cv', cv: 'cv', file: 'x', email: 'ada@example.com',
      password: 'hunter2', access_token: 'tok', phone: '+234', projects: [{ title: 'P', description: 'd', rawText: 'leak', secret: 1 }],
    })!
    const json = JSON.stringify(d)
    for (const bad of ['THE WHOLE CV', 'ada@example.com', 'hunter2', 'tok', '+234', 'leak', 'rawText', 'password', 'access_token']) {
      expect(json).not.toContain(bad)
    }
    expect(d.name).toBe('Ada')
  })

  it('caps lengths and counts, and keeps only http(s) links', () => {
    const d = sanitizeDraft({
      name: 'x'.repeat(500), bio: 'b'.repeat(2000), github_url: 'javascript:alert(1)', linkedin_url: 'https://linkedin.com/in/ada',
      skills: Array.from({ length: 40 }, (_, i) => `s${i}`),
      projects: Array.from({ length: 9 }, (_, i) => ({ title: `p${i}`, url: i === 0 ? 'data:text/html,x' : 'https://ex.com' })),
      template: '../../etc', candidates: [{ id: 'c', title: 'T', repo_url: 'file:///x', live_url: 'ftp://x' }],
    })!
    expect(d.name).toHaveLength(80)
    expect(d.bio).toHaveLength(500)
    expect(d.github_url).toBe('')
    expect(d.linkedin_url).toBe('https://linkedin.com/in/ada')
    expect(d.skills).toHaveLength(15)
    expect(d.projects).toHaveLength(4)
    expect(d.projects[0].url).toBe('')
    expect(d.template).toBe('') // not chosen: the recommended look is used (lib/blocks/presets.ts)
    expect(d.candidates[0].repo_url).toBe('')
    expect(d.candidates[0].live_url).toBeNull()
  })

  it('rejects non-objects and survives corrupt storage', () => {
    expect(sanitizeDraft(null)).toBeNull()
    expect(sanitizeDraft([])).toBeNull()
    expect(sanitizeDraft('str')).toBeNull()
    const m = memory()
    m.setItem(DRAFT_KEY, '{not json')
    expect(createDraftStore(m).load()).toBeNull()
    expect(createDraftStore(null).load()).toBeNull()
  })

  it('round-trips, never stores the e-mail from an import, and clear() removes it', () => {
    const m = memory()
    const store = createDraftStore(m)
    const d = draftFromImport({ name: 'Ada', role: 'Eng', email: 'ada@example.com', skills: ['Go'], projects: [{ title: 'P', description: 'd', stack: ['go'], url: 'https://x.dev' }] } as never)
    store.save(d)
    expect(m.data.get(DRAFT_KEY)).not.toContain('ada@example.com')
    expect(store.load()?.projects[0].stack).toBe('go')
    store.clear()
    expect(m.data.has(DRAFT_KEY)).toBe(false)
  })

  it('is cleared on sign-out, even when signOut throws', async () => {
    const m = memory()
    const store = createDraftStore(m)
    store.save(sanitizeDraft({ name: 'Ada' })!)
    await expect(signOutAndClear({ signOut: async () => { throw new Error('offline') } }, store)).rejects.toThrow()
    expect(m.data.has(DRAFT_KEY)).toBe(false)
    store.save(sanitizeDraft({ name: 'Ada' })!)
    await signOutAndClear({ signOut: async () => ({}) }, store)
    expect(m.data.has(DRAFT_KEY)).toBe(false)
  })
})

describe('generate payload and retries', () => {
  const draft = sanitizeDraft({
    status: 'reviewed', name: 'Ada', role: 'Eng', skills: ['Go'], template: 'bold',
    projects: [{ title: 'P', description: 'd', stack: 'go, pg', url: 'https://x.dev' }, { title: '' }],
    experience: [{ company: 'Acme', role: 'Dev', period: '2021', bullets: 'a\n\nb' }, { company: '', role: '' }],
    education: [{ degree: 'BSc', institution: 'U' }, { degree: '' }],
  }) as Draft

  it('maps the reviewed draft to the /api/generate body (email from the account, blank rows dropped)', () => {
    const p = draftToGeneratePayload(draft, 'ada@example.com')
    expect(p.email).toBe('ada@example.com')
    expect(p.projects).toEqual([{ title: 'P', description: 'd', stack: ['go', 'pg'], url: 'https://x.dev/' }])
    expect(p.experience[0].bullets).toEqual(['a', 'b'])
    expect(p.experience).toHaveLength(1)
    expect(p.education).toHaveLength(1)
    expect(p.template).toBe('bold')
  })

  const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })
  const noWait = async () => {}

  it('timeout (504) twice then success: ok after 3 attempts', async () => {
    const call = vi.fn()
      .mockResolvedValueOnce(res(504)).mockResolvedValueOnce(res(504)).mockResolvedValueOnce(res(200, { portfolio_id: 'p1' }))
    const wait = vi.fn(noWait)
    expect(await generateWithRetry(call, { wait })).toEqual({ ok: true, portfolioId: 'p1', attempts: 3 })
    expect(wait).toHaveBeenCalledTimes(2)
  })
  it('network error then success; a 200 without an id counts as failed attempt', async () => {
    const call = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(res(200, {})).mockResolvedValueOnce(res(200, { portfolio_id: 'p2' }))
    expect((await generateWithRetry(call, { wait: noWait })).ok).toBe(true)
  })
  it('gives up after the last try with a manual-retry result', async () => {
    const call = vi.fn().mockResolvedValue(res(500))
    expect(await generateWithRetry(call, { wait: noWait })).toEqual({ ok: false, reason: 'failed', attempts: 3 })
    expect(call).toHaveBeenCalledTimes(3)
  })
  it.each([[401, 'unauthorized'], [429, 'rate_limited'], [400, 'bad_request']] as const)('%s stops immediately as %s', async (status, reason) => {
    const call = vi.fn().mockResolvedValue(res(status, { error: 'x' }))
    const r = await generateWithRetry(call, { wait: noWait })
    expect(r).toMatchObject({ ok: false, reason, attempts: 1 })
    expect(call).toHaveBeenCalledTimes(1)
  })
  it('a repeat call that returns the existing portfolio is just a success (idempotent server)', async () => {
    const call = vi.fn().mockResolvedValue(res(200, { portfolio_id: 'p-existing', preview_ready: true }))
    expect(await generateWithRetry(call, { wait: noWait })).toMatchObject({ ok: true, portfolioId: 'p-existing', attempts: 1 })
  })
})

describe('messages', () => {
  it('interpolates and falls back to the key', () => {
    expect(t('verify.body', { email: 'a@b.co' })).toContain('a@b.co')
    expect(t('nope.missing')).toBe('nope.missing')
  })
  it('every error code the auth layer can return has a message', () => {
    for (const c of ['weak_password', 'captcha', 'rate_limited', 'invalid_credentials', 'code_invalid', 'network', 'unknown', 'unauthorized']) {
      expect(t(`errors.${c}`)).not.toBe(`errors.${c}`)
    }
  })
})
