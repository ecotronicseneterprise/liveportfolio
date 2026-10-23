import { ConnectorResult, ImportError, ImportProject, LIMITS, Provenance } from './types'
import { cleanUrl, dedupeStrings, normalizeProfile } from './normalize'

// GitHub connector: public data only, no AI. GITHUB_TOKEN (optional, server-side only) lifts the
// rate limit from 60/h per server IP to 5000/h. The token is never sent to the client or logged.

const API = 'https://api.github.com'
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

// ── 1h in-process TTL cache ────────────────────────────────────────────────────
// Limitations: lives in this Node process only — cleared on every restart/deploy, not shared
// between instances (PM2 fork mode = one instance today), bounded to MAX_ENTRIES (oldest evicted).
const TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 200
const cache = new Map<string, { expires: number; value: ConnectorResult }>()

function cacheGet(key: string): ConnectorResult | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key: string, value: ConnectorResult) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { expires: Date.now() + TTL_MS, value })
}

/** Accepts "octocat", "@octocat", or a github.com URL. Returns null if invalid. */
export function parseGithubUsername(input: string): string | null {
  const s = input.trim().replace(/^@/, '')
  const fromUrl = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  const name = fromUrl ? fromUrl[1] : s
  return USERNAME_RE.test(name) ? name : null
}

interface GhUser {
  login: string
  name: string | null
  bio: string | null
  location: string | null
  email: string | null
  blog: string | null
  html_url: string
}

interface GhRepo {
  name: string
  full_name: string
  description: string | null
  fork: boolean
  archived: boolean
  language: string | null
  topics?: string[]
  homepage: string | null
  html_url: string
  stargazers_count: number
  pushed_at: string
}

async function gh<T>(path: string, accept = 'application/vnd.github+json'): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'liveportfolio-import',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  let res: Response
  try {
    res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(8000), cache: 'no-store' })
  } catch {
    throw new ImportError('upstream_unavailable', 'GitHub did not respond. Please try again shortly.')
  }

  if (res.status === 404) return null
  if (res.status === 403 || res.status === 429) {
    throw new ImportError('rate_limited', 'GitHub is rate-limiting us right now. Please try again in a few minutes.')
  }
  if (!res.ok) throw new ImportError('upstream_unavailable', 'GitHub returned an error. Please try again shortly.')

  return (accept.includes('raw') ? ((await res.text()) as unknown) : await res.json()) as T
}

/** First meaningful paragraph of a README, stripped of markdown noise. */
function readmeIntro(md: string): string {
  const paragraphs = md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .split(/\n{2,}/)
    .map((p) => p.replace(/^[#>*\-\s`]+/, '').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 30 && !/^(badge|build|license)/i.test(p))
  return paragraphs[0] ?? ''
}

export async function importGithub(usernameInput: string): Promise<ConnectorResult> {
  const username = parseGithubUsername(usernameInput)
  if (!username) {
    throw new ImportError('invalid_username', 'That does not look like a valid GitHub username.')
  }

  const key = username.toLowerCase()
  const cached = cacheGet(key)
  if (cached) return cached

  const user = await gh<GhUser>(`/users/${username}`)
  if (!user) throw new ImportError('not_found', `We couldn't find a GitHub user called "${username}".`)

  const repos =
    (await gh<GhRepo[]>(`/users/${username}/repos?type=owner&sort=pushed&per_page=100`)) ?? []

  const own = repos.filter(
    (r) => !r.fork && !r.archived && r.name.toLowerCase() !== username.toLowerCase() && r.name !== '.github'
  )
  if (own.length === 0) {
    throw new ImportError(
      'no_public_repos',
      'That account has no public, non-fork repositories to import. Add projects manually instead.'
    )
  }

  const ranked = [...own].sort(
    (a, b) =>
      b.stargazers_count - a.stargazers_count ||
      Date.parse(b.pushed_at) - Date.parse(a.pushed_at)
  )
  const top = ranked.slice(0, LIMITS.projects)

  // README intro only for repos with no description (≤ 4 extra requests, failures ignored).
  const projects: ImportProject[] = await Promise.all(
    top.map(async (r) => {
      let description = r.description?.trim() ?? ''
      if (!description) {
        try {
          const md = await gh<string>(`/repos/${r.full_name}/readme`, 'application/vnd.github.raw')
          if (md) description = readmeIntro(md)
        } catch {
          // optional enrichment — never fail the import for it
        }
      }
      return {
        title: r.name.replace(/[-_]+/g, ' ').trim() || r.name,
        description,
        stack: dedupeStrings([...(r.language ? [r.language] : []), ...(r.topics ?? []).slice(0, 4)], 6),
        url: cleanUrl(r.homepage) ?? r.html_url,
      }
    })
  )

  // Skills: languages ordered by how many of the user's own repos use them.
  const langCount = new Map<string, number>()
  for (const r of own) if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1)
  const skills = [...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l]) => l)

  const linkedin = user.blog && /linkedin\.com\/in\//i.test(user.blog) ? user.blog : null

  const profile = normalizeProfile({
    name: user.name,
    bio: user.bio,
    location: user.location,
    email: user.email,
    github_url: user.html_url,
    linkedin_url: linkedin,
    skills,
    projects,
  })

  const provenance: Provenance[] = (Object.keys(profile) as Array<keyof typeof profile>)
    .filter((k) => {
      const v = profile[k]
      return Array.isArray(v) ? v.length > 0 : !!v
    })
    .map((field) => ({ field, source: 'github' as const }))

  const result: ConnectorResult = {
    source: 'github',
    profile,
    provenance,
    warnings: projects.some((p) => !p.description)
      ? ['Some GitHub projects have no description — add one so we can write a stronger case study.']
      : [],
  }
  cacheSet(key, result)
  return result
}
