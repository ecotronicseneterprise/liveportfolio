import { z } from 'zod'
import { callLLM, LlmError } from '../llm'
import { isGrounded } from './grounding'
import { RANK, RepoFacts, isProfileOrSiteRepo, rankRepos, scoreRepo } from './github-rank'
import { aggregateSkills, projectStack } from './github-skills'
import { cleanUrl, normalizeProfile, truncateWords } from './normalize'
import { isGithubAvatarUrl, isLinkedinProfileUrl } from './safe-url'
import { ConnectorResult, ImportError, ImportProject, LIMITS, ProjectCandidate, Provenance } from './types'

// GitHub connector — public data only. GITHUB_TOKEN (optional, SERVER-SIDE ONLY, never sent to the client or
// logged) raises limits: core 60 → 5,000 requests/h, search 10 → 30/min.
//
// Selection: pinned repos (GraphQL) would be the user's own curation, but they need a token and were NOT verified
// on a real account (unauthenticated GraphQL quota is 0), so they are intentionally not implemented. Instead:
//   REST search  user:<login> fork:false archived:false  (≤ 1,000 results, 100/page)
//   → fallback to the plain repo listing when the search quota is exhausted
//   → scored ranking (github-rank.ts) → ~10 candidates, best 4 pre-selected (the form and /api/generate take at most 4) (the review form lets the user change it).

const API = 'https://api.github.com'
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
const SEARCH_RESULT_CAP = 1000
const MAX_PAGES = 10

export interface GithubImportOptions {
  /** Defaults to process.env.GITHUB_TOKEN. Server-side only. */
  token?: string
  /** Repo names (or owner/name) the user never wants offered. Case-insensitive. */
  exclude?: string[]
  /** Optional README → one-sentence description for empty/short ones. Defaults to GITHUB_README_SUMMARY === 'true'. */
  readmeSummary?: boolean
  /** Clock for the recency score (tests). */
  now?: number
}

interface GhUser {
  login: string
  name: string | null
  bio: string | null
  location: string | null
  email: string | null
  blog: string | null
  html_url: string
  avatar_url: string
  public_repos: number
}
interface GhRepo extends RepoFacts { html_url: string }
interface SearchResponse { total_count: number; incomplete_results: boolean; items: GhRepo[] }

// ── HTTP layer: 1 h in-process cache with ETag revalidation ───────────────────────────────────────────────
// Entries older than the TTL are revalidated with If-None-Match; a 304 costs no rate-limit quota.
// Limitations: per Node process, cleared on restart/deploy, not shared between instances, bounded (oldest evicted).
const TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 300
interface CacheEntry { etag?: string; status: number; body: unknown; expires: number }
const cache = new Map<string, CacheEntry>()
let coreRemaining: number | null = null // last seen core quota (from response headers)

export function __resetGithubCache() {
  cache.clear()
  coreRemaining = null
}

interface Req { token?: string; accept?: string; method?: 'GET' | 'HEAD' }
interface Res { status: number; data: unknown; remaining: number | null; fromCache: boolean }

async function request(path: string, o: Req = {}): Promise<Res> {
  const method = o.method ?? 'GET'
  const accept = o.accept ?? 'application/vnd.github+json'
  const key = `${method} ${accept} ${o.token ? 'auth' : 'anon'} ${path}`
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return { status: hit.status, data: hit.body, remaining: null, fromCache: true }

  const headers: Record<string, string> = { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'liveportfolio-import' }
  if (o.token) headers.Authorization = `Bearer ${o.token}`
  if (hit?.etag) headers['If-None-Match'] = hit.etag

  let res: Response
  try {
    res = await fetch(`${API}${path}`, { method, headers, signal: AbortSignal.timeout(8000), cache: 'no-store' })
  } catch {
    throw new ImportError('upstream_unavailable', 'GitHub did not respond. Please try again shortly.')
  }

  const remainingHeader = res.headers.get('x-ratelimit-remaining')
  const remaining = remainingHeader === null ? null : Number(remainingHeader)
  if (res.headers.get('x-ratelimit-resource') === 'core' && remaining !== null) coreRemaining = remaining

  if (res.status === 304 && hit) {
    hit.expires = now + TTL_MS
    return { status: hit.status, data: hit.body, remaining, fromCache: true }
  }
  if (res.status === 404 || res.status === 422) return { status: res.status, data: null, remaining, fromCache: false }
  if (res.status === 403 || res.status === 429) {
    throw new ImportError('rate_limited', 'GitHub is rate-limiting us right now. Please try again in a few minutes.')
  }
  if (!res.ok) throw new ImportError('upstream_unavailable', 'GitHub returned an error. Please try again shortly.')

  let body: unknown = null
  if (method === 'GET') {
    try { body = accept.includes('raw') ? await res.text() : await res.json() } catch {
      throw new ImportError('upstream_unavailable', 'GitHub returned an unreadable response.')
    }
  }
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { etag: res.headers.get('etag') ?? undefined, status: res.status, body, expires: now + TTL_MS })
  return { status: res.status, data: body, remaining, fromCache: false }
}

/** Accepts "octocat", "@octocat", or a github.com URL. Returns null if invalid. */
export function parseGithubUsername(input: string): string | null {
  const s = input.trim().replace(/^@/, '')
  const fromUrl = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  const name = fromUrl ? fromUrl[1] : s
  return USERNAME_RE.test(name) ? name : null
}

// ── repo listing ──────────────────────────────────────────────────────────────────────────────────────────
async function viaSearch(login: string, token: string | undefined, warnings: string[]): Promise<GhRepo[]> {
  const q = encodeURIComponent(`user:${login} fork:false archived:false`)
  const out: GhRepo[] = []
  let total = Infinity
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await request(`/search/repositories?q=${q}&sort=updated&order=desc&per_page=100&page=${page}`, { token })
    if (r.status === 422) throw new ImportError('not_found', `We couldn't find a GitHub user called "${login}".`)
    const body = r.data as SearchResponse | null
    if (!body || !Array.isArray(body.items)) break
    total = body.total_count
    out.push(...body.items)
    if (body.incomplete_results) warnings.push('GitHub reported incomplete search results; some repositories may be missing.')
    if (body.items.length < 100 || out.length >= Math.min(total, SEARCH_RESULT_CAP)) break
    if (r.remaining !== null && r.remaining <= 0) {
      warnings.push('GitHub search quota reached; only part of your repositories were considered.')
      break
    }
  }
  if (total > SEARCH_RESULT_CAP) {
    warnings.push(`GitHub search returns at most ${SEARCH_RESULT_CAP.toLocaleString()} repositories; the ${SEARCH_RESULT_CAP.toLocaleString()} most recently updated were considered.`)
  }
  return out
}

async function viaList(login: string, token: string | undefined, warnings: string[]): Promise<GhRepo[]> {
  const out: GhRepo[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await request(`/users/${login}/repos?type=owner&sort=pushed&per_page=100&page=${page}`, { token })
    const items = (r.data as GhRepo[] | null) ?? []
    out.push(...items.filter((x) => !x.fork && !x.archived))
    if (items.length < 100) return out
  }
  warnings.push(`Only the ${MAX_PAGES * 100} most recently pushed repositories were considered.`)
  return out
}

async function listRepos(login: string, token: string | undefined, warnings: string[]): Promise<GhRepo[]> {
  try {
    return await viaSearch(login, token, warnings)
  } catch (e) {
    if (!(e instanceof ImportError) || e.code !== 'rate_limited') throw e
    warnings.push('GitHub search is busy; used the plain repository list instead.')
    return viaList(login, token, warnings)
  }
}

// ── README helpers ────────────────────────────────────────────────────────────────────────────────────────
async function readmeExists(fullName: string, token?: string): Promise<boolean | null> {
  try {
    const r = await request(`/repos/${fullName}/readme`, { token, method: 'HEAD' })
    return r.status === 200
  } catch {
    return null // rate-limited / unavailable: unknown, not "absent"
  }
}

function readmeExcerpt(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500)
}

const SummarySchema = z.object({ summary: z.string().nullable() })
const SUMMARY_SYSTEM =
  'You write one factual sentence (at most 25 words) describing what a software project does, using ONLY facts stated in the README excerpt. ' +
  'No marketing language, no first person, no invented features, numbers, users or technologies. ' +
  'If the excerpt does not say what the project does, return null.'

/** README → one grounded sentence, or null. Token counts (never content) are logged. */
async function summariseReadme(repo: string, excerpt: string): Promise<string | null> {
  if (excerpt.length < 80) return null
  try {
    const r = await callLLM({
      purpose: 'import.github.readme',
      pii: 'redact',
      system: SUMMARY_SYSTEM,
      input: `README EXCERPT:\n${excerpt}`,
      schema: SummarySchema,
      schemaName: 'readme_summary',
      temperature: 0.2,
      maxTokens: 120,
    })
    console.info(`[github-readme] repo=${repo} tokens in=${r.usage.promptTokens} out=${r.usage.completionTokens}`)
    const s = r.data.summary?.trim() ?? ''
    return s && isGrounded(s, excerpt) ? s : null
  } catch (e) {
    if (e instanceof LlmError || e instanceof ImportError) return null
    throw e
  }
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────
export async function importGithub(usernameInput: string, opts: GithubImportOptions = {}): Promise<ConnectorResult> {
  const login = parseGithubUsername(usernameInput)
  if (!login) throw new ImportError('invalid_username', 'That does not look like a valid GitHub username.')
  const token = opts.token ?? process.env.GITHUB_TOKEN ?? undefined
  const now = opts.now ?? Date.now()
  const warnings: string[] = []

  const u = await request(`/users/${login}`, { token })
  if (u.status === 404 || !u.data) throw new ImportError('not_found', `We couldn't find a GitHub user called "${login}".`)
  const user = u.data as GhUser
  if (user.public_repos === 0) {
    throw new ImportError('no_public_repos', 'That account has no public repositories. Add projects manually instead.')
  }

  const all = await listRepos(login, token, warnings)
  if (all.length === 0) {
    throw new ImportError('no_public_repos', 'That account only has forks or archived repositories to import. Add projects manually instead.')
  }

  // exclusions: user's list, profile README repo, .github, and <login>.github.io unless it is the only live site
  const excluded = new Set((opts.exclude ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean))
  let eligible = all.filter((r) => !excluded.has(r.name.toLowerCase()) && !excluded.has(r.full_name.toLowerCase()))
  const siteName = `${login}.github.io`.toLowerCase()
  const blog = cleanUrl(user.blog)
  const blogIsElsewhere = !!blog && !new URL(blog).hostname.toLowerCase().endsWith('.github.io')
  const otherLiveSite = blogIsElsewhere || eligible.some((r) => r.name.toLowerCase() !== siteName && !!cleanUrl(r.homepage))
  eligible = eligible.filter((r) => !isProfileOrSiteRepo(r.name, login, otherLiveSite))
  if (eligible.length === 0) {
    throw new ImportError('no_public_repos', 'No suitable public repositories were found to import. Add projects manually instead.')
  }

  // README existence only for the best preliminary candidates, and only if quota allows
  const prelim = [...eligible].sort((a, b) => scoreRepo(b, { now }) - scoreRepo(a, { now })).slice(0, RANK.readmeChecks)
  const readme = new Set<string>()
  if (!token && coreRemaining !== null && coreRemaining < prelim.length + 5) {
    warnings.push('Skipped README checks to stay within GitHub\'s unauthenticated rate limit.')
  } else {
    const found = await Promise.all(prelim.map(async (r) => [r.full_name, await readmeExists(r.full_name, token)] as const))
    for (const [name, has] of found) if (has) readme.add(name)
    if (found.some(([, has]) => has === null)) warnings.push('Some README checks were skipped because GitHub is rate-limiting us.')
  }

  const ranked = rankRepos(eligible, { now, readme })
  const useAi = opts.readmeSummary ?? process.env.GITHUB_README_SUMMARY === 'true'

  const candidates: ProjectCandidate[] = []
  for (const { repo: r, selected } of ranked) {
    let description = truncateWords(r.description ?? '', LIMITS.projectDescription)
    let ai = false
    if (useAi && selected && description.length < 25) {
      const md = await request(`/repos/${r.full_name}/readme`, { token, accept: 'application/vnd.github.raw' }).catch(() => null)
      if (md && typeof md.data === 'string') {
        const s = await summariseReadme(r.full_name, readmeExcerpt(md.data))
        if (s) { description = truncateWords(s, LIMITS.projectDescription); ai = true }
      }
    }
    const isSite = r.name.toLowerCase() === siteName
    const live = cleanUrl(r.homepage) ?? (isSite ? `https://${r.name}/` : null)
    candidates.push({
      id: r.full_name,
      title: r.name.replace(/[-_]+/g, ' ').trim() || r.name,
      description,
      ...(ai ? { ai_description: true as const } : {}),
      stack: projectStack(r.language, r.topics),
      repo_url: r.html_url,
      ...(live ? { live_url: live } : {}),
      stars: r.stargazers_count,
      pushed_at: r.pushed_at,
      selected,
    })
  }
  if (candidates.some((c) => c.selected && !c.description)) {
    warnings.push('Some selected projects have no description on GitHub — add one so we can write a stronger case study.')
  }

  // the draft's projects = the pre-selected ones (the form and /api/generate take at most LIMITS.projects)
  const projects: ImportProject[] = candidates
    .filter((c) => c.selected)
    .slice(0, LIMITS.projects)
    .map((c) => ({ title: c.title, description: c.description, stack: c.stack, url: c.live_url ?? c.repo_url }))

  const skills = aggregateSkills(ranked.map(({ repo, selected }) => ({ language: repo.language, topics: repo.topics, selected })))

  const avatar: string | null = isGithubAvatarUrl(user.avatar_url) ? user.avatar_url : null
  const linkedin = blog && isLinkedinProfileUrl(blog) ? blog : null

  const profile = normalizeProfile({
    name: user.name,
    bio: user.bio,
    location: user.location,
    email: user.email,
    github_url: user.html_url,
    linkedin_url: linkedin,
    avatar_url: avatar,
    skills,
    projects,
    project_candidates: candidates,
  })

  const provenance: Provenance[] = (Object.keys(profile) as Array<keyof typeof profile>)
    .filter((k) => {
      const v = profile[k]
      return Array.isArray(v) ? v.length > 0 : !!v
    })
    .map((field) => ({ field, source: 'github' as const }))

  return { source: 'github', profile, provenance, warnings }
}
