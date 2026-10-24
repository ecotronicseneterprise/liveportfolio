// GitHub connector tests. No live network: every request is answered by a router over recorded fixtures
// (tests/fixtures/github/*, recorded from the public account "cliffordnwanna") or generated data.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ mode: 'ok' as string, calls: 0, lastInput: '' as string }))
vi.mock('openai', () => ({
  default: class {
    beta = {
      chat: {
        completions: {
          parse: async (args: { messages: Array<{ content: string }> }) => {
            h.calls++
            h.lastInput = args.messages.map((m) => m.content).join('\n')
            const parsed = h.mode === 'ungrounded'
              ? { summary: 'Serves 2 million users with a blockchain-backed quantum engine.' }
              : h.mode === 'null' ? { summary: null } : { summary: 'Streamlit app that predicts telecom customer churn with a trained model.' }
            return { choices: [{ message: { parsed } }], usage: { prompt_tokens: 321, completion_tokens: 18 } }
          },
        },
      },
    }
  },
}))

import { importGithub, parseGithubUsername, __resetGithubCache } from '../lib/connectors/github'
import { RANK, isProfileOrSiteRepo, rankRepos, scoreRepo, type RepoFacts } from '../lib/connectors/github-rank'
import { ALIASES, aggregateSkills, projectStack } from '../lib/connectors/github-skills'
import { isGrounded } from '../lib/connectors/grounding'
import { mergeResults } from '../lib/connectors/merge'
import { truncateWords } from '../lib/connectors/normalize'
import { reconcileProjects, type FormSlice } from '../lib/connectors/to-form'
import { ImportError } from '../lib/connectors/types'

const FIX = path.join(__dirname, 'fixtures', 'github')
const realUser = JSON.parse(fs.readFileSync(path.join(FIX, 'cliffordnwanna.user.json'), 'utf8'))
const realSearch = JSON.parse(fs.readFileSync(path.join(FIX, 'cliffordnwanna.search.json'), 'utf8'))
const NOW = Date.parse('2026-10-24T00:00:00Z')

// ── fetch router ─────────────────────────────────────────────────────────────────────────────────────────
interface Seen { url: string; method: string; headers: Record<string, string> }
type Handler = (u: URL, init: RequestInit, n: number) => Response | undefined
let seen: Seen[] = []

function install(handler: Handler) {
  seen = []
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    seen.push({ url: u.pathname + u.search, method: (init.method ?? 'GET').toUpperCase(), headers: Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>)) })
    const r = handler(u, init, seen.length)
    return r ?? new Response('{}', { status: 404 })
  }) as typeof fetch
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

function realAccount(extra: Handler = () => undefined): Handler {
  return (u, init, n) =>
    extra(u, init, n) ??
    (u.pathname === '/users/cliffordnwanna' ? json(realUser)
      : u.pathname === '/search/repositories' ? json(realSearch)
      : u.pathname.endsWith('/readme') && (init.method ?? 'GET') === 'HEAD' ? new Response(null, { status: 200 })
      : undefined)
}

const repo = (name: string, o: Partial<RepoFacts> & { html_url?: string } = {}): RepoFacts & { html_url: string } => ({
  name, full_name: `acct/${name}`, description: 'A reasonably descriptive project about something useful.', stargazers_count: 0,
  pushed_at: '2026-09-01T00:00:00Z', size: 500, homepage: null, topics: [], language: 'Python', fork: false, archived: false,
  html_url: `https://github.com/acct/${name}`, ...o,
})

beforeEach(() => {
  __resetGithubCache()
  delete process.env.GITHUB_TOKEN
  delete process.env.GITHUB_README_SUMMARY
  process.env.OPENAI_API_KEY = 'test'
  h.mode = 'ok'; h.calls = 0; h.lastInput = ''
})
const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks() })

// ── real account (recorded) ───────────────────────────────────────────────────────────────────────────────
describe('real account fixture (cliffordnwanna)', () => {
  it('pre-selects the substantial, shipped projects and leaves out stubs and the portfolio-site repo', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW })
    const cands = r.profile.project_candidates!
    const picked = cands.filter((c) => c.selected).map((c) => c.title)
    expect(cands.length).toBeLessThanOrEqual(10)
    expect(picked.length).toBeLessThanOrEqual(6)
    for (const want of ['JOB HUNTER', 'BODYBALANCE.AI', 'Jarvis', 'deriv fraud copilot demo']) expect(picked, want).toContain(want)
    const all = cands.map((c) => c.title)
    for (const never of ['Profile', 'PROJECTS', '-SQL', 'gen ai bootcamp 2025', 'cliffordnwanna.github.io']) expect(all, never).not.toContain(never)
  })

  it('keeps repo link and live link separate; the draft url prefers the live link', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW })
    const jarvis = r.profile.project_candidates!.find((c) => c.title === 'Jarvis')!
    expect(jarvis.repo_url).toBe('https://github.com/cliffordnwanna/Jarvis')
    expect(jarvis.live_url).toContain('vercel.app')
    const churn = r.profile.project_candidates!.find((c) => c.title.startsWith('EXPRESSO'))
    if (churn) expect(churn.live_url).toBeUndefined()
    expect(r.profile.projects!.find((p) => p.title === 'Jarvis')!.url).toContain('vercel.app')
  })

  it('descriptions are cut at word boundaries with an ellipsis, never mid-word, and fit the cap', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW })
    for (const c of r.profile.project_candidates!) {
      expect(c.description.length).toBeLessThanOrEqual(200)
      if (c.description.endsWith('…')) {
        const original = (realSearch.items.find((x: { full_name: string }) => x.full_name === c.id).description as string).replace(/\s+/g, ' ').trim()
        const head = c.description.slice(0, -1)
        expect(original.startsWith(head)).toBe(true)
        expect(/[A-Za-z0-9]/.test(original[head.length] ?? ' ')).toBe(false) // the cut sits on a word boundary (next char is space/punctuation)
      }
    }
  })

  it('skills: aliased, deduplicated, ≤ 12, no file formats or non-skill topics', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW })
    const skills = r.profile.skills!
    expect(skills.length).toBeLessThanOrEqual(12)
    expect(skills).toContain('Python')
    for (const bad of ['Jupyter Notebook', 'jupyter-notebook', 'gdpr-compliant', 'career-tech', 'cloud', 'deployment', 'renewab']) expect(skills).not.toContain(bad)
    expect(new Set(skills.map((s) => s.toLowerCase())).size).toBe(skills.length)
    const bb = r.profile.project_candidates!.find((c) => c.title === 'BODYBALANCE.AI')!
    expect(bb.stack).toContain('OpenAI') // typo topic "opeanai" is mapped, not dropped
  })

  it('imports the avatar (GitHub CDN only) and does not store the unused blog URL', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW })
    expect(r.profile.avatar_url).toMatch(/^https:\/\/avatars\.githubusercontent\.com\//)
    expect(JSON.stringify(r.profile)).not.toContain('"blog"')
    const draft = mergeResults([r]).draft
    expect(draft.avatar_url).toBe(r.profile.avatar_url)
    expect(draft.project_candidates.length).toBeGreaterThan(0)
  })

  it('a non-GitHub avatar host is dropped', async () => {
    install((u) => u.pathname === '/users/cliffordnwanna' ? json({ ...realUser, avatar_url: 'https://evil.example/a.png' }) : realAccount()(u, {}, 0))
    const r = await importGithub('cliffordnwanna', { now: NOW })
    expect(r.profile.avatar_url).toBeUndefined()
  })

  it('exclude list removes a repo (by name or owner/name, case-insensitive)', async () => {
    install(realAccount())
    const r = await importGithub('cliffordnwanna', { now: NOW, exclude: ['job_hunter', 'CLIFFORDNWANNA/Jarvis'] })
    const titles = r.profile.project_candidates!.map((c) => c.title)
    expect(titles).not.toContain('JOB HUNTER')
    expect(titles).not.toContain('Jarvis')
  })

  it('makes few requests: 1 user + 1 search page + ≤ 15 README HEADs', async () => {
    install(realAccount())
    await importGithub('cliffordnwanna', { now: NOW })
    expect(seen.filter((s) => s.url.startsWith('/search')).length).toBe(1)
    expect(seen.filter((s) => s.method === 'HEAD').length).toBeLessThanOrEqual(RANK.readmeChecks)
    expect(seen.length).toBeLessThanOrEqual(17)
  })
})

// ── token handling ────────────────────────────────────────────────────────────────────────────────────────
describe('token handling', () => {
  it('no token: no Authorization header is sent, and the connector still works', async () => {
    install(realAccount())
    await importGithub('cliffordnwanna', { now: NOW })
    expect(seen.length).toBeGreaterThan(0)
    for (const s of seen) expect(Object.keys(s.headers).map((k) => k.toLowerCase())).not.toContain('authorization')
  })

  it('token from option or env is sent as a Bearer header and never appears in the result', async () => {
    install(realAccount())
    process.env.GITHUB_TOKEN = 'ghp_secret_from_env'
    const r = await importGithub('cliffordnwanna', { now: NOW })
    expect(seen.every((s) => s.headers.Authorization === 'Bearer ghp_secret_from_env')).toBe(true)
    expect(JSON.stringify(r)).not.toContain('ghp_secret')
    __resetGithubCache()
    install(realAccount())
    await importGithub('cliffordnwanna', { now: NOW, token: 'ghp_option' })
    expect(seen[0].headers.Authorization).toBe('Bearer ghp_option')
  })

  it('unauthenticated with a low core quota: README checks are skipped with a warning (not an error)', async () => {
    install(realAccount((u) => u.pathname === '/users/cliffordnwanna'
      ? json(realUser, 200, { 'x-ratelimit-remaining': '3', 'x-ratelimit-resource': 'core' }) : undefined))
    const r = await importGithub('cliffordnwanna', { now: NOW })
    expect(seen.some((s) => s.method === 'HEAD')).toBe(false)
    expect(r.warnings.join(' ')).toMatch(/README checks/)
    expect(r.profile.project_candidates!.length).toBeGreaterThan(0)
  })
})

// ── pagination, caps, empty and failing accounts ─────────────────────────────────────────────────────────
describe('listing edge cases', () => {
  const manyRepos = (n: number) => Array.from({ length: n }, (_, i) =>
    repo(`proj-${String(i).padStart(4, '0')}`, {
      pushed_at: new Date(NOW - i * 864e5).toISOString(),
      description: i % 7 === 0 ? 'A well described production service with a live demo.' : 'short',
      homepage: i % 7 === 0 ? `https://demo-${i}.example.dev` : null,
      size: 300 + i,
    }))

  it('> 100 repos: follows pages, honours the 1,000-result cap and says so', async () => {
    const all = manyRepos(1200)
    install((u) => {
      if (u.pathname === '/users/acct') return json({ ...realUser, login: 'acct', html_url: 'https://github.com/acct', public_repos: 1200, blog: null })
      if (u.pathname === '/search/repositories') {
        const page = Number(u.searchParams.get('page') ?? 1)
        return json({ total_count: 1200, incomplete_results: false, items: all.slice((page - 1) * 100, page * 100) })
      }
      if (u.pathname.endsWith('/readme')) return new Response(null, { status: 200 })
      return undefined
    })
    const r = await importGithub('acct', { now: NOW })
    const pages = seen.filter((s) => s.url.startsWith('/search'))
    expect(pages.length).toBe(10) // 10 × 100 = the 1,000-result cap
    expect(r.warnings.join(' ')).toMatch(/at most 1,000/)
    expect(r.profile.project_candidates!.every((c) => c.selected ? true : true)).toBe(true)
    expect(r.profile.project_candidates!.filter((c) => c.selected).length).toBe(RANK.selectedCount)
    expect(r.profile.project_candidates![0].live_url).toBeTruthy() // shipped, described and recent beats the rest
  })

  it('100 repos exactly: one page only', async () => {
    const all = manyRepos(100)
    install((u) => u.pathname === '/users/acct' ? json({ ...realUser, login: 'acct', public_repos: 100 })
      : u.pathname === '/search/repositories' ? json({ total_count: 100, incomplete_results: false, items: all })
      : u.pathname.endsWith('/readme') ? new Response(null, { status: 200 }) : undefined)
    await importGithub('acct', { now: NOW })
    expect(seen.filter((s) => s.url.startsWith('/search')).length).toBe(1)
  })

  it('all forks / archived: search returns nothing → explicit no_public_repos', async () => {
    install((u) => u.pathname === '/users/acct' ? json({ ...realUser, login: 'acct', public_repos: 7 })
      : u.pathname === '/search/repositories' ? json({ total_count: 0, incomplete_results: false, items: [] }) : undefined)
    const err = await importGithub('acct', { now: NOW }).catch((e) => e)
    expect(err).toBeInstanceOf(ImportError)
    expect(err.code).toBe('no_public_repos')
    expect(err.message).toMatch(/forks or archived/)
  })

  it('empty account (0 public repos): no_public_repos without searching', async () => {
    install((u) => u.pathname === '/users/acct' ? json({ ...realUser, login: 'acct', public_repos: 0 }) : undefined)
    const err = await importGithub('acct', { now: NOW }).catch((e) => e)
    expect(err.code).toBe('no_public_repos')
    expect(seen.some((s) => s.url.startsWith('/search'))).toBe(false)
  })

  it('unknown user → not_found; invalid name → invalid_username (no request)', async () => {
    install(() => new Response('{}', { status: 404 }))
    expect((await importGithub('nobody-here', { now: NOW }).catch((e) => e)).code).toBe('not_found')
    seen = []
    expect((await importGithub('not valid!!').catch((e) => e)).code).toBe('invalid_username')
    expect(seen.length).toBe(0)
  })

  it('search rate-limited → falls back to the plain listing (forks/archived filtered) with a warning', async () => {
    install((u) => {
      if (u.pathname === '/users/acct') return json({ ...realUser, login: 'acct', public_repos: 3, blog: null })
      if (u.pathname === '/search/repositories') return json({ message: 'rate limit' }, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-resource': 'search' })
      if (u.pathname === '/users/acct/repos') return json([repo('keep-me', { homepage: 'https://x.example.dev' }), repo('a-fork', { fork: true }), repo('old', { archived: true })])
      if (u.pathname.endsWith('/readme')) return new Response(null, { status: 200 })
      return undefined
    })
    const r = await importGithub('acct', { now: NOW })
    expect(r.profile.project_candidates!.map((c) => c.title)).toEqual(['keep me'])
    expect(r.warnings.join(' ')).toMatch(/search is busy/)
  })

  it('both search and listing rate-limited → rate_limited error', async () => {
    install((u) => u.pathname === '/users/acct' ? json({ ...realUser, login: 'acct', public_repos: 3 }) : json({}, 403, { 'x-ratelimit-remaining': '0' }))
    const err = await importGithub('acct', { now: NOW }).catch((e) => e)
    expect(err.code).toBe('rate_limited')
  })

  it('GitHub 5xx / network failure → upstream_unavailable', async () => {
    install(() => new Response('', { status: 502 }))
    expect((await importGithub('acct', { now: NOW }).catch((e) => e)).code).toBe('upstream_unavailable')
    globalThis.fetch = (async () => { throw new Error('ECONNRESET') }) as typeof fetch
    __resetGithubCache()
    expect((await importGithub('acct', { now: NOW }).catch((e) => e)).code).toBe('upstream_unavailable')
  })
})

describe('HTTP cache and ETag revalidation', () => {
  it('within the TTL nothing is re-fetched; after it, If-None-Match is sent and a 304 reuses the body', async () => {
    let userHits = 0
    install((u, init) => {
      if (u.pathname === '/users/cliffordnwanna') {
        userHits++
        const inm = (init.headers as Record<string, string>)['If-None-Match']
        return inm === '"etag-1"' ? new Response(null, { status: 304 }) : json(realUser, 200, { etag: '"etag-1"' })
      }
      return realAccount()(u, init, 0)
    })
    const t0 = Date.now()
    const a = await importGithub('cliffordnwanna', { now: NOW })
    const requestsAfterFirst = seen.length
    await importGithub('cliffordnwanna', { now: NOW })
    expect(seen.length).toBe(requestsAfterFirst) // served from cache
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 2 * 60 * 60 * 1000) // 2 h later
    const b = await importGithub('cliffordnwanna', { now: NOW })
    expect(userHits).toBe(2)
    const revalidation = seen.find((s) => s.url === '/users/cliffordnwanna' && s.headers['If-None-Match'])
    expect(revalidation?.headers['If-None-Match']).toBe('"etag-1"')
    expect(b.profile.name).toBe(a.profile.name) // body came from cache after the 304
  })
})

// ── pure units ───────────────────────────────────────────────────────────────────────────────────────────
describe('profile / site repo rule', () => {
  it('excludes the profile README repo and .github; <login>.github.io only when it is not the only live site', () => {
    expect(isProfileOrSiteRepo('acct', 'acct', false)).toBe(true)
    expect(isProfileOrSiteRepo('.github', 'acct', false)).toBe(true)
    expect(isProfileOrSiteRepo('acct.github.io', 'acct', true)).toBe(true)
    expect(isProfileOrSiteRepo('acct.github.io', 'acct', false)).toBe(false)
    expect(isProfileOrSiteRepo('other', 'acct', true)).toBe(false)
  })

  it('github.io is kept (with its live link) when it is the only live site', async () => {
    install((u) => u.pathname === '/users/acct' ? json({ ...realUser, login: 'acct', public_repos: 2, blog: null })
      : u.pathname === '/search/repositories' ? json({ total_count: 2, incomplete_results: false, items: [repo('acct.github.io', { homepage: null, language: 'HTML' }), repo('lib-thing')] })
      : u.pathname.endsWith('/readme') ? new Response(null, { status: 200 }) : undefined)
    const r = await importGithub('acct', { now: NOW })
    const site = r.profile.project_candidates!.find((c) => c.title === 'acct.github.io')
    expect(site?.live_url).toBe('https://acct.github.io/')
    expect(site?.repo_url).toBe('https://github.com/acct/acct.github.io')
  })
})

describe('ranking', () => {
  const base = repo('thing')
  it('rewards recent, described, shipped, topical, substantial repos; stars only break ties', () => {
    const now = NOW
    const strong = scoreRepo({ ...base, homepage: 'https://x.dev', topics: ['a', 'b', 'c'], size: 5000 }, { now, hasReadme: true })
    const stub = scoreRepo({ ...base, description: null, size: 3 }, { now })
    expect(strong).toBeGreaterThan(stub + 5)
    const old = scoreRepo({ ...base, pushed_at: '2021-01-01T00:00:00Z' }, { now })
    expect(scoreRepo(base, { now })).toBeGreaterThan(old)
    expect(scoreRepo({ ...base, stargazers_count: 3 }, { now })).toBeLessThan(scoreRepo(base, { now }) + 2)
    expect(scoreRepo(repo('gen-ai-bootcamp-2025'), { now })).toBeLessThan(scoreRepo(base, { now }))
  })

  it('is deterministic, returns ≤ 10 candidates, flags ≤ 6, and does not flag weak repos', () => {
    const weak = Array.from({ length: 15 }, (_, i) => repo(`stub-${i}`, { description: null, size: 1, pushed_at: '2019-01-01T00:00:00Z' }))
    const ranked = rankRepos(weak, { now: NOW })
    expect(ranked.length).toBe(10)
    expect(ranked.filter((x) => x.selected).length).toBe(0)
    const good = Array.from({ length: 15 }, (_, i) => repo(`good-${String(i).padStart(2, '0')}`, { homepage: 'https://x.dev' }))
    const a = rankRepos(good, { now: NOW }), b = rankRepos([...good].reverse(), { now: NOW })
    expect(a.map((x) => x.repo.name)).toEqual(b.map((x) => x.repo.name))
    expect(a.filter((x) => x.selected).length).toBe(RANK.selectedCount)
  })
})

describe('skills', () => {
  it('maps notebooks to Python, weights HTML/CSS low, drops non-skills, caps at 12', () => {
    expect(ALIASES['jupyter-notebook'].name).toBe('Python')
    const repos = [
      { language: 'Jupyter Notebook', topics: ['gdpr-compliant', 'career-tech', 'streamlit', 'opeanai'], selected: true },
      { language: 'HTML', topics: ['config'], selected: true },
      { language: 'Python', topics: ['renewab', 'tensroflow'], selected: false },
    ]
    const s = aggregateSkills(repos)
    expect(s[0]).toBe('Python')
    expect(s).toEqual(expect.arrayContaining(['Streamlit', 'OpenAI', 'TensorFlow', 'HTML']))
    expect(s).not.toContain('Jupyter Notebook')
    expect(s).not.toContain('renewab')
    expect(s.indexOf('HTML')).toBeGreaterThan(s.indexOf('Streamlit')) // low weight
    const many = Array.from({ length: 30 }, (_, i) => ({ language: null, topics: Object.keys(ALIASES).slice(i, i + 3), selected: true }))
    expect(aggregateSkills(many).length).toBeLessThanOrEqual(12)
  })

  it('project stack: aliased language first, known topics only, ≤ 6, no duplicates', () => {
    const st = projectStack('Jupyter Notebook', ['python', 'streamlit', 'cloud', 'deployment', 'rag', 'langchain', 'openai', 'azure'])
    expect(st[0]).toBe('Python')
    expect(st).not.toContain('cloud')
    expect(st.length).toBeLessThanOrEqual(6)
    expect(new Set(st).size).toBe(st.length)
  })
})

describe('truncateWords', () => {
  it('leaves short text alone and cuts long text at a word boundary with an ellipsis within the cap', () => {
    expect(truncateWords('Short text.', 200)).toBe('Short text.')
    const long = 'The Expresso Churn Prediction App is a machine learning-based web application designed to predict customer churn for Expresso, a telecommunications service provider in Africa. This project demonstrates deployment.'
    const t = truncateWords(long, 200)
    expect(t.length).toBeLessThanOrEqual(200)
    expect(t.endsWith('…')).toBe(true)
    expect(long.startsWith(t.slice(0, -1))).toBe(true)
    expect(t).not.toMatch(/demonstrat…$/)
    const noSpaces = truncateWords('x'.repeat(500), 100)
    expect(noSpaces.length).toBe(100)
    expect(noSpaces.endsWith('…')).toBe(true)
  })
})

describe('grounding filter', () => {
  const readme = 'This Streamlit application predicts customer churn for a telecommunications company using a trained machine learning model.'
  it('accepts paraphrases that stay within the README', () => {
    expect(isGrounded('Streamlit app that predicts telecom customer churn with a machine learning model', readme)).toBe(true)
  })
  it('rejects invented numbers, invented technologies, multiple sentences and links', () => {
    expect(isGrounded('Streamlit app serving 2 million users to predict customer churn', readme)).toBe(false)
    expect(isGrounded('A blockchain quantum engine that predicts customer churn at scale', readme)).toBe(false)
    expect(isGrounded('Predicts customer churn. Also does billing and invoicing.', readme)).toBe(false)
    expect(isGrounded('Predicts customer churn, see https://evil.example for more', readme)).toBe(false)
    expect(isGrounded('Churn', readme)).toBe(false)
  })
})

describe('optional README one-liner (flag, callLLM, grounding, token log)', () => {
  const account = (descr: string | null) => (u: URL, init: RequestInit) => {
    if (u.pathname === '/users/acct') return json({ ...realUser, login: 'acct', public_repos: 1, blog: null })
    if (u.pathname === '/search/repositories') return json({ total_count: 1, incomplete_results: false, items: [repo('churn-app', { description: descr, homepage: 'https://x.dev', topics: ['a', 'b'], size: 900 })] })
    if (u.pathname.endsWith('/readme') && (init.method ?? 'GET') === 'HEAD') return new Response(null, { status: 200 })
    if (u.pathname.endsWith('/readme')) return new Response('# Churn\n\nThis Streamlit application predicts customer churn for a telecommunications company using a trained machine learning model. Contact: owner@example.com\n', { status: 200 })
    return undefined
  }

  it('default OFF: no model call, short description stays as-is', async () => {
    install(account('Assessment'))
    const r = await importGithub('acct', { now: NOW })
    expect(h.calls).toBe(0)
    expect(r.profile.project_candidates![0].description).toBe('Assessment')
  })

  it('ON: empty/short description → one grounded sentence, flagged AI-suggested, tokens logged, e-mail redacted before the call', async () => {
    install(account(null))
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const r = await importGithub('acct', { now: NOW, readmeSummary: true })
    const c = r.profile.project_candidates![0]
    expect(h.calls).toBe(1)
    expect(c.description).toMatch(/churn/i)
    expect(c.ai_description).toBe(true)
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/\[github-readme\] repo=acct\/churn-app tokens in=321 out=18/))
    expect(h.lastInput).not.toContain('owner@example.com')
    expect(h.lastInput).toMatch(/\[EMAIL_1\]/)
  })

  it('ON but the description is already good: no call', async () => {
    install(account('A solid description that is long enough to need no help at all.'))
    await importGithub('acct', { now: NOW, readmeSummary: true })
    expect(h.calls).toBe(0)
  })

  it('ON: an ungrounded (invented) sentence is discarded and the original description kept', async () => {
    h.mode = 'ungrounded'
    install(account('Assessment'))
    const r = await importGithub('acct', { now: NOW, readmeSummary: true })
    expect(h.calls).toBe(1)
    expect(r.profile.project_candidates![0].description).toBe('Assessment')
    expect(r.profile.project_candidates![0].ai_description).toBeUndefined()
  })

  it('ON: model says null → nothing changes; env flag works too', async () => {
    h.mode = 'null'
    install(account(null))
    process.env.GITHUB_README_SUMMARY = 'true'
    const r = await importGithub('acct', { now: NOW })
    expect(h.calls).toBe(1)
    expect(r.profile.project_candidates![0].description).toBe('')
  })

  it('ON but the privacy filter is down: no raw text is sent and the import still succeeds', async () => {
    process.env.PII_ENGINE = 'presidio'
    install(account(null))
    const r = await importGithub('acct', { now: NOW, readmeSummary: true })
    delete process.env.PII_ENGINE
    expect(h.calls).toBe(0)
    expect(r.profile.project_candidates!.length).toBe(1)
  })
})

describe('form reconciliation (picker → rows)', () => {
  const blankRow = { title: '', description: '', stack: '', url: '', imageFile: null, image_preview: '' }
  const slice = (projects: FormSlice['projects']): FormSlice => ({
    avatar_url: '', name: '', role: '', email: '', location: '', bio: '', github_url: '', linkedin_url: '',
    directSkills: [], certifications: [], projects, experience: [], education: [],
  })
  const cands = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((t) => ({
    id: `acct/${t}`, title: t, description: `${t} desc`, stack: ['Python'], repo_url: `https://github.com/acct/${t}`, stars: 0, pushed_at: '2026-01-01T00:00:00Z', selected: false,
  }))

  it('builds rows from ticked candidates in candidate order, capped at 4; url = live ?? repo', () => {
    const out = reconcileProjects(slice([blankRow]), [{ ...cands[0], live_url: 'https://a.dev' }, ...cands.slice(1)], cands.map((c) => c.id))
    expect(out.projects.length).toBe(4)
    expect(out.projects[0].url).toBe('https://a.dev')
    expect(out.projects[1].url).toBe('https://github.com/acct/beta')
  })

  it('keeps the user\'s edits and images for still-ticked rows, and manual rows that match no candidate', () => {
    const edited = { ...blankRow, title: 'alpha', description: 'my own words', imageFile: null, image_preview: 'blob:x' }
    const manual = { ...blankRow, title: 'Hand-written project', description: 'mine' }
    const out = reconcileProjects(slice([edited, manual]), cands, ['acct/alpha', 'acct/beta'])
    expect(out.projects[0].description).toBe('my own words')
    expect(out.projects[0].image_preview).toBe('blob:x')
    expect(out.projects.map((p) => p.title)).toEqual(['alpha', 'beta', 'Hand-written project'])
  })

  it('unticking everything leaves one blank row so the form stays valid', () => {
    const out = reconcileProjects(slice([blankRow]), cands, [])
    expect(out.projects).toEqual([blankRow])
  })
})

describe('username parsing', () => {
  it('accepts names and URLs, rejects junk', () => {
    expect(parseGithubUsername('@octocat')).toBe('octocat')
    expect(parseGithubUsername('https://github.com/octocat/hello')).toBe('octocat')
    expect(parseGithubUsername('bad name!')).toBeNull()
    expect(parseGithubUsername('-leading')).toBeNull()
  })
})
