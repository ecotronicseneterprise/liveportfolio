import { ImportDraft, ImportExperience, ImportProject, ImportEducation, LIMITS, ProjectCandidate } from './types'
import { isGithubAvatarUrl } from './safe-url'

export function stripBulletMarker(s: string): string {
  return s.replace(/^[\s▸•→\-\*▶‣◦]+/, '').trim()
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/**
 * Shorten at a word boundary and add an ellipsis (total length ≤ max). Text that already fits is returned
 * unchanged. With no usable space the cut is hard, but still ends with the ellipsis.
 */
export function truncateWords(v: unknown, max: number): string {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''
  if (s.length <= max) return s
  const room = max - 1
  const cut = s.slice(0, room + 1)
  const space = cut.lastIndexOf(' ')
  const head = space >= Math.floor(room * 0.5) ? cut.slice(0, space) : s.slice(0, room)
  return head.replace(/[\s,;:.\-–—]+$/, '') + '…'
}

function strOrNull(v: unknown, max: number): string | null {
  const s = str(v, max)
  return s ? s : null
}

export function dedupeStrings(items: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    const key = s.toLowerCase()
    if (!s || seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= max) break
  }
  return out
}

/** Only http(s) URLs survive; anything else (javascript:, data:, bare text) is dropped. */
export function cleanUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  const withScheme = /^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s) ? `https://${s}` : null
  if (!withScheme) return null
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString().slice(0, 200) : null
  } catch {
    return null
  }
}

function normalizeProject(p: Partial<ImportProject> | null | undefined): ImportProject | null {
  const title = str(p?.title, 80)
  if (!title) return null
  const url = cleanUrl(p?.url)
  return {
    title,
    description: truncateWords(p?.description, LIMITS.projectDescription),
    stack: dedupeStrings(Array.isArray(p?.stack) ? p!.stack!.map((s) => str(s, 30)) : [], 10),
    ...(url ? { url } : {}),
  }
}

function normalizeExperience(e: Partial<ImportExperience> | null | undefined): ImportExperience | null {
  const company = str(e?.company, 80)
  const role = str(e?.role, 80)
  if (!company && !role) return null
  const bullets = (Array.isArray(e?.bullets) ? e!.bullets! : [])
    .map((b) => stripBulletMarker(String(b)))
    .filter((b) => b.length > 0 && !b.endsWith(':'))
    .slice(0, LIMITS.bulletsPerRole)
    .map((b) => b.slice(0, LIMITS.bullet))
  return { company, role, period: str(e?.period, 40), bullets }
}

function normalizeEducation(e: Partial<ImportEducation> | null | undefined): ImportEducation | null {
  const degree = str(e?.degree, 100)
  const institution = str(e?.institution, 100)
  if (!degree && !institution) return null
  const grade = str(e?.grade, 40)
  return { degree, institution, year: str(e?.year, 20), ...(grade ? { grade } : {}) }
}

function normalizeCandidate(c: Partial<ProjectCandidate> | null | undefined): ProjectCandidate | null {
  const repo = cleanUrl(c?.repo_url)
  const id = str(c?.id, 120)
  const title = str(c?.title, 80)
  if (!repo || !id || !title) return null
  const live = cleanUrl(c?.live_url)
  return {
    id,
    title,
    description: truncateWords(c?.description, LIMITS.projectDescription),
    ...(c?.ai_description ? { ai_description: true as const } : {}),
    stack: dedupeStrings(Array.isArray(c?.stack) ? c!.stack!.map((s) => str(s, 30)) : [], 6),
    repo_url: repo,
    ...(live ? { live_url: live } : {}),
    stars: Math.max(0, Math.floor(Number(c?.stars) || 0)),
    pushed_at: str(c?.pushed_at, 30),
    selected: !!c?.selected,
  }
}

/** Clamp, trim and sanitise any partial profile to the same caps /api/generate enforces. */
export function normalizeProfile(raw: Partial<ImportDraft> | null | undefined): Partial<ImportDraft> {
  const r = raw ?? {}
  const out: Partial<ImportDraft> = {}

  const scalars: Array<[keyof ImportDraft, string | null]> = [
    ['name', strOrNull(r.name, 80)],
    ['role', strOrNull(r.role, 80)],
    ['email', strOrNull(r.email, 120)],
    ['location', strOrNull(r.location, 80)],
  ]
  for (const [k, v] of scalars) if (v) (out as Record<string, unknown>)[k] = v

  const bio = truncateWords(r.bio, LIMITS.bio)
  if (bio) out.bio = bio
  const gh = cleanUrl(r.github_url)
  const li = cleanUrl(r.linkedin_url)
  if (gh) out.github_url = gh
  if (li) out.linkedin_url = li

  // remote avatars only from GitHub's CDN (exact host); anything else would let a crafted value load from any server
  if (isGithubAvatarUrl(r.avatar_url)) out.avatar_url = r.avatar_url
  if (Array.isArray(r.project_candidates)) {
    out.project_candidates = r.project_candidates
      .map(normalizeCandidate)
      .filter((c): c is ProjectCandidate => !!c)
      .slice(0, 10)
  }

  if (Array.isArray(r.skills)) {
    out.skills = dedupeStrings(r.skills.map((s) => str(s, 50)), LIMITS.skills)
  }
  if (Array.isArray(r.certifications)) {
    out.certifications = dedupeStrings(r.certifications.map((s) => str(s, 80)), LIMITS.certifications)
  }
  if (Array.isArray(r.projects)) {
    out.projects = r.projects
      .map(normalizeProject)
      .filter((p): p is ImportProject => !!p)
      .slice(0, LIMITS.projects)
  }
  if (Array.isArray(r.experience)) {
    out.experience = r.experience
      .map(normalizeExperience)
      .filter((e): e is ImportExperience => !!e)
      .slice(0, LIMITS.experience)
  }
  if (Array.isArray(r.education)) {
    out.education = r.education
      .map(normalizeEducation)
      .filter((e): e is ImportEducation => !!e)
      .slice(0, LIMITS.education)
  }
  return out
}

export function emptyDraft(): ImportDraft {
  return {
    name: null, role: null, email: null, location: null, bio: null,
    github_url: null, linkedin_url: null,
    skills: [], certifications: [], projects: [], experience: [], education: [],
    avatar_url: null, project_candidates: [],
  }
}
