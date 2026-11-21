// Pure helpers for the assistant's editing tools (no I/O). They compute the NEW value of a field from the current one, detect
// duplicates, place new roles in order, and decide when a change is risky enough to need the person's approval.
import { applyOps, OpError, type Json } from '@/lib/portfolio/ops'

export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const list = (c: Json, k: string): Json[] => (Array.isArray(c[k]) ? (c[k] as Json[]) : [])

export type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string }
const fail = (code: string, message: string) => ({ ok: false as const, code, message })

// ── certifications and education (additive, duplicate-safe) ──────────────────────────────────────────────────
export function withCertification(current: unknown, name: string): Result<string[]> {
  const cur = (Array.isArray(current) ? current : []).filter((x): x is string => typeof x === 'string')
  const n = name.trim()
  if (!n) return fail('invalid_input', 'A certification needs a name.')
  if (cur.some((c) => norm(c) === norm(n))) return fail('duplicate', `"${n}" is already on the portfolio.`)
  if (cur.length >= 12) return fail('limit', 'At most 12 certifications. Ask the person which one to replace.')
  return { ok: true, value: [...cur, n] }
}

export interface Edu { degree: string; institution: string; year?: string; period?: string; grade?: string }
export function withEducation(current: unknown, e: Edu): Result<Edu[]> {
  const cur = (Array.isArray(current) ? current : []) as Edu[]
  if (cur.some((x) => norm(x.degree) === norm(e.degree) && norm(x.institution) === norm(e.institution))) return fail('duplicate', `"${e.degree}" at ${e.institution} is already on the portfolio.`)
  if (cur.length >= 50) return fail('limit', 'The education list is full.')
  return { ok: true, value: [...cur, { degree: e.degree.trim(), institution: e.institution.trim(), year: e.year ?? '', ...(e.period ? { period: e.period } : {}), ...(e.grade ? { grade: e.grade } : {}) }] }
}

// ── text edits that never rewrite what they were not asked to touch ──────────────────────────────────────────
export function appendText(current: unknown, text: string, where: 'start' | 'end', joiner: string): string {
  const cur = String(current ?? '').trim()
  const add = text.trim()
  if (!cur) return add
  return where === 'end' ? `${cur}${joiner}${add}` : `${add}${joiner}${cur}`
}

/** Replaces ONE exact occurrence. Zero or several matches is an error, so it can never hit the wrong place. */
export function replaceSnippet(current: unknown, oldText: string, newText: string): Result<string> {
  const cur = String(current ?? '')
  if (!oldText) return fail('invalid_input', 'old_text cannot be empty.')
  const first = cur.indexOf(oldText)
  if (first < 0) return fail('not_found', 'That text was not found. Call portfolio_get and copy the exact text.')
  if (cur.indexOf(oldText, first + 1) >= 0) return fail('ambiguous', 'That text appears more than once. Use a longer, unique snippet.')
  return { ok: true, value: cur.slice(0, first) + newText + cur.slice(first + oldText.length) }
}

// ── bullets (role highlights) ────────────────────────────────────────────────────────────────────────────────
export function bulletsOf(c: Json, section: 'experience', index: number): Result<string[]> {
  const item = list(c, section)[index]
  if (!item) return fail('out_of_range', `Role ${index + 1} does not exist.`)
  return { ok: true, value: (Array.isArray(item.bullets) ? item.bullets : []).filter((b): b is string => typeof b === 'string') }
}
export function insertBullet(bullets: string[], text: string, at?: number): Result<string[]> {
  const t = text.trim()
  if (!t) return fail('invalid_input', 'The bullet is empty.')
  if (bullets.some((b) => norm(b) === norm(t))) return fail('duplicate', 'That line is already there.')
  if (bullets.length >= 12) return fail('limit', 'At most 12 lines per role.')
  const i = at === undefined ? bullets.length : Math.min(Math.max(at, 0), bullets.length)
  return { ok: true, value: [...bullets.slice(0, i), t, ...bullets.slice(i)] }
}
export function setBullet(bullets: string[], i: number, text: string): Result<string[]> {
  if (i < 0 || i >= bullets.length) return fail('out_of_range', `Line ${i + 1} does not exist.`)
  const t = text.trim()
  if (!t) return fail('invalid_input', 'The line is empty. To remove it use portfolio_remove_bullet.')
  return { ok: true, value: bullets.map((b, k) => (k === i ? t : b)) }
}
export function moveBullet(bullets: string[], from: number, to: number): Result<string[]> {
  if ([from, to].some((i) => i < 0 || i >= bullets.length)) return fail('out_of_range', 'That position does not exist.')
  const a = [...bullets]; const [m] = a.splice(from, 1); a.splice(to, 0, m)
  return { ok: true, value: a }
}
export function dropBullet(bullets: string[], i: number): Result<string[]> {
  if (i < 0 || i >= bullets.length) return fail('out_of_range', `Line ${i + 1} does not exist.`)
  return { ok: true, value: bullets.filter((_, k) => k !== i) }
}

// ── career order ─────────────────────────────────────────────────────────────────────────────────────────────
const years = (s: string) => (s.match(/(?:19|20)\d{2}/g) ?? []).map(Number)
const isCurrent = (s: string) => /present|current|now|ongoing/i.test(s)
/** Position for a new role in a newest-first list; falls back to the top for a current role, otherwise the end. */
export function chronologicalIndex(existing: Json[], period: string): number {
  const key = (p: string): [number, number] => {
    const ys = years(p)
    return [isCurrent(p) ? 9999 : ys.length ? Math.max(...ys) : 0, ys.length ? Math.min(...ys) : 0]
  }
  const mine = key(period)
  if (!mine[0]) return existing.length
  const i = existing.findIndex((e) => {
    const t = key(String(e.period ?? ''))
    return t[0] < mine[0] || (t[0] === mine[0] && t[1] < mine[1])
  })
  return i < 0 ? existing.length : i
}
/** If the new role is current and an older one still says "present", the assistant should offer to end it. */
export function staleCurrentRole(existing: Json[], period: string): string | null {
  if (!isCurrent(period)) return null
  const e = existing.find((x) => isCurrent(String(x.period ?? '')))
  return e ? `${String(e.role ?? 'Your previous role')} at ${String(e.company ?? '')}`.trim() : null
}

// ── when an edit needs the person's approval even though it is a "direct" tool ───────────────────────────────
const TEXT_GUARD = ['about', 'headline', 'skills_narrative'] as const
const urlSet = (c: Json): Set<string> => {
  const out = new Set<string>()
  for (const k of ['github_url', 'linkedin_url', 'twitter_url', 'instagram_url', 'facebook_url', 'youtube_url', 'tiktok_url', 'website_url']) if (typeof c[k] === 'string' && c[k]) out.add(String(c[k]))
  for (const p of list(c, 'projects')) for (const k of ['url', 'github_url']) if (typeof p[k] === 'string' && p[k]) out.add(String(p[k]))
  return out
}

/** Why this edit must wait for the person, or null if it can be saved at once. Links are the riskiest content (a swapped URL on a public page). */
export function approvalReason(before: Json, template: string, ops: unknown): string | null {
  let after: Json
  try { after = applyOps({ content: before, template }, ops).state.content } catch (e) { if (e instanceof OpError) return null; throw e }
  const was = urlSet(before)
  if ([...urlSet(after)].some((u) => !was.has(u))) return 'This adds or changes a link. Links on a public page are checked by the person first.'
  for (const k of TEXT_GUARD) {
    const b = String(before[k] ?? '').trim().length, a = String(after[k] ?? '').trim().length
    if (b >= 120 && a < b * 0.4) return `This would cut the ${k} from ${b} to ${a} characters.`
  }
  for (const k of ['skills', 'projects', 'experience', 'education', 'certifications', 'testimonials']) {
    const b = list(before, k).length, a = list(after, k).length
    if (b >= 4 && a < b * 0.5) return `This would cut ${k} from ${b} items to ${a}.`
  }
  return null
}

export function auditHealth(c: Json): string[] {
  const out: string[] = []
  const projects = list(c, 'projects'), exp = list(c, 'experience')
  if (!String(c.about ?? '').trim()) out.push('The About section is empty.')
  else if (String(c.about).split(/\s+/).length < 60) out.push('The About section is short (under 60 words).')
  if (!list(c, 'education').length) out.push('No education is listed.')
  if (!exp.length) out.push('No work experience is listed.')
  exp.forEach((e, i) => { if (!(Array.isArray(e.bullets) && e.bullets.length)) out.push(`Role ${i + 1} (${String(e.company ?? '')}) has no highlights.`) })
  projects.forEach((p, i) => {
    if (!String(p.outcome ?? '').trim()) out.push(`Project ${i + 1} (${String(p.title ?? '')}) has no outcome.`)
    else if (!/\d/.test(String(p.outcome))) out.push(`Project ${i + 1} (${String(p.title ?? '')}) states no figure; add one only if the person can verify it.`)
    if (!p.image_url) out.push(`Project ${i + 1} (${String(p.title ?? '')}) has no picture.`)
  })
  if (!c.avatar_url) out.push('There is no profile photo.')
  if (!list(c, 'certifications').length) out.push('No certifications are listed (skip if the person has none).')
  return out
}
