// What the public page draws, measured against what is stored. One function feeds the dashboard notices, the assistant (portfolio_get,
// portfolio_preview_changes) and the tests, so "is everything shown?" has one answer. It runs the same adapter the page runs (toBlockData),
// so it cannot drift from the page. Pure: no I/O.
import type { PortfolioContent } from '@/components/templates/Minimal'
import { toBlockData, PHONE_KEEP, PROJECT_TEXT_MAX, TESTIMONIAL_TEXT_MAX } from '@/lib/blocks/adapt'
import { isProTemplate } from '@/lib/plans'

export interface DisplayRow {
  section: string
  /** Items the page draws (on a desktop: all of them are visible). */
  shown: number
  /** Items stored. */
  total: number
  /** True when any stored character of this section is not drawn. Should always be false for the free designs. */
  truncated: boolean
  /** Items a phone folds behind a labelled "Show N more" control (free designs only; nothing is removed). */
  folded_on_phone?: number
  /** A plain sentence for the person or the assistant, only when something needs saying. */
  note?: string
}

type Json = Record<string, unknown>
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : [])
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

export function displayReport(content: Partial<PortfolioContent> | Json | null | undefined, template?: string): DisplayRow[] {
  const c = (content ?? {}) as Json
  const d = toBlockData(c as Partial<PortfolioContent>)
  const pro = !!template && isProTemplate(template)
  const phone = (n: number, keep: number) => (pro ? 0 : Math.max(0, n - keep))
  const rows: DisplayRow[] = []

  const projects = arr(c.projects)
  const cut = projects.some((p, i) => ['problem', 'solution', 'outcome'].some((f) => text(p[f]).length > PROJECT_TEXT_MAX))
  rows.push({
    section: 'projects', shown: d.projects.length, total: projects.length, truncated: cut,
    ...(d.projects.length < projects.length ? { note: `${projects.length - d.projects.length} project(s) have no title, so the page leaves them out.` } : {}),
  })

  const stackTotal = projects.reduce((n, p) => n + (Array.isArray(p.stack) ? p.stack.length : 0), 0)
  const stackShown = d.projects.reduce((n, p) => n + p.stack.length, 0)
  const stackFolded = d.projects.reduce((n, p) => n + phone(p.stack.length, PHONE_KEEP.stack), 0)
  if (stackTotal) rows.push({ section: 'stack', shown: stackShown, total: stackTotal, truncated: stackShown < stackTotal, ...(stackFolded ? { folded_on_phone: stackFolded } : {}) })

  const roles = arr(c.experience)
  rows.push({ section: 'experience', shown: d.experience.length, total: roles.length, truncated: d.experience.length < roles.length, ...(d.experience.length < roles.length ? { note: 'A role needs a company or a job title to be shown.' } : {}) })
  const bulletsTotal = roles.reduce((n, r) => n + (Array.isArray(r.bullets) ? r.bullets.length : 0), 0)
  const bulletsShown = d.experience.reduce((n, r) => n + r.bullets.length, 0)
  const bulletsFolded = d.experience.reduce((n, r) => n + phone(r.bullets.length, PHONE_KEEP.bullets), 0)
  if (bulletsTotal) rows.push({
    section: 'experience bullets', shown: bulletsShown, total: bulletsTotal, truncated: bulletsShown < bulletsTotal,
    ...(bulletsFolded ? { folded_on_phone: bulletsFolded, note: `On a phone, each role shows its first ${PHONE_KEEP.bullets} lines and a "Show N more" button. Put the strongest lines first.` } : {}),
  })

  const quotes = arr(c.testimonials)
  const quoteCut = quotes.some((q) => text(q.text).length > TESTIMONIAL_TEXT_MAX)
  if (quotes.length) rows.push({
    section: 'testimonials', shown: d.quotes.length, total: quotes.length, truncated: quoteCut || d.quotes.length < quotes.length,
    ...(phone(d.quotes.length, PHONE_KEEP.quotes) ? { folded_on_phone: phone(d.quotes.length, PHONE_KEEP.quotes) } : {}),
    ...(d.quotes.length < quotes.length ? { note: 'A testimonial needs both its text and the author to be shown.' } : {}),
  })

  const aboutText = text(c.about)
  if (aboutText) rows.push({ section: 'about', shown: d.about.length, total: aboutText.split(/\n\s*\n/).filter((x) => x.trim()).length, truncated: false })

  const edu = arr(c.education)
  if (edu.length) rows.push({ section: 'education', shown: d.education.length, total: edu.length, truncated: d.education.length < edu.length })
  const certs = Array.isArray(c.certifications) ? (c.certifications as unknown[]).filter((x) => text(x)) : []
  if (certs.length) rows.push({ section: 'certifications', shown: d.certifications.length, total: certs.length, truncated: d.certifications.length < certs.length })

  const awardsStored = arr(c.awards)
  if (awardsStored.length) rows.push({
    section: 'awards', shown: d.awards.length, total: awardsStored.length, truncated: d.awards.length < awardsStored.length,
    ...(phone(d.awards.length, PHONE_KEEP.awards) ? { folded_on_phone: phone(d.awards.length, PHONE_KEEP.awards) } : {}),
    ...(d.awards.length < awardsStored.length ? { note: 'An award needs a title and an issuer to be shown.' } : {}),
  })

  // skills: the page draws the groups when there are any, so a skill that is only in the flat list is saved but not drawn
  const groups = arr(c.skills_grouped)
  const flat = (Array.isArray(c.skills) ? (c.skills as unknown[]) : []).map(text).filter(Boolean)
  if (groups.length) {
    const inGroups = new Set(groups.flatMap((g) => (Array.isArray(g.items) ? g.items : []).map((x) => text(x).toLowerCase())))
    const hidden = flat.filter((x) => !inGroups.has(x.toLowerCase()))
    if (hidden.length) rows.push({ section: 'skills', shown: flat.length - hidden.length, total: flat.length, truncated: true, note: `${hidden.length} skill(s) are only in the flat list and are not drawn because skill groups exist: ${hidden.slice(0, 5).join(', ')}.` })
  }
  return rows
}

/** Rows that need the person's attention: something is cut, left out or folded. */
export const displayNotices = (rows: DisplayRow[]): DisplayRow[] => rows.filter((r) => r.truncated || r.folded_on_phone || r.note)

// ── how much of each text field is used ──────────────────────────────────────────────────────────────────
export interface Usage { length: number; limit: number; remaining: number; words: number }
const usage = (v: unknown, limit: number): Usage => {
  const s = text(v)
  return { length: s.length, limit, remaining: limit - s.length, words: s ? s.split(/\s+/).length : 0 }
}

/** Characters used and left for every text field (characters, because the limits are characters), with a word count as a helper. */
export function textUsage(content: Partial<PortfolioContent> | Json | null | undefined, limits: Record<string, number>): Json {
  const c = (content ?? {}) as Json
  const out: Json = {}
  for (const k of ['name', 'role', 'headline', 'about', 'location', 'skills_narrative']) if (k in limits) out[k] = usage(c[k], limits[k])
  out.projects = arr(c.projects).map((p, i) => ({ index: i, title: text(p.title), problem: usage(p.problem, PROJECT_TEXT_MAX), solution: usage(p.solution, PROJECT_TEXT_MAX), outcome: usage(p.outcome, PROJECT_TEXT_MAX) }))
  out.experience_bullets = arr(c.experience).map((r, i) => {
    const b = (Array.isArray(r.bullets) ? r.bullets : []) as unknown[]
    return { index: i, company: text(r.company), bullets: b.length, max_bullets: 12, longest: Math.max(0, ...b.map((x) => text(x).length)), limit_each: 400 }
  })
  out.testimonials = arr(c.testimonials).map((q, i) => ({ index: i, author: text(q.author), text: usage(q.text, TESTIMONIAL_TEXT_MAX) }))
  return out
}
