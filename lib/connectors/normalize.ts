import { ImportDraft, ImportExperience, ImportProject, ImportEducation, LIMITS } from './types'

export function stripBulletMarker(s: string): string {
  return s.replace(/^[\s▸•→\-\*▶‣◦]+/, '').trim()
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''
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
    description: str(p?.description, LIMITS.projectDescription),
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

/** Clamp, trim and sanitise any partial profile to the same caps /api/generate enforces. */
export function normalizeProfile(raw: Partial<ImportDraft> | null | undefined): Partial<ImportDraft> {
  const r = raw ?? {}
  const out: Partial<ImportDraft> = {}

  const scalars: Array<[keyof ImportDraft, string | null]> = [
    ['name', strOrNull(r.name, 80)],
    ['role', strOrNull(r.role, 80)],
    ['email', strOrNull(r.email, 120)],
    ['location', strOrNull(r.location, 80)],
    ['bio', strOrNull(r.bio, LIMITS.bio)],
  ]
  for (const [k, v] of scalars) if (v) (out as Record<string, unknown>)[k] = v

  const gh = cleanUrl(r.github_url)
  const li = cleanUrl(r.linkedin_url)
  if (gh) out.github_url = gh
  if (li) out.linkedin_url = li

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
  }
}
