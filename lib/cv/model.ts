// The CV model: what goes into the exported CV, built from the SAME stored content and the SAME normaliser (toBlockData) that the public
// page uses, so the CV and the page can never disagree about what a project, bullet or award is. The CV only decides layout; it never
// invents, rewrites or keeps a second copy of the content. Pure: no I/O, no React.
//
// Completeness rule (the display-completeness invariant, applied to the export): everything stored either appears in the file, or is listed in
// `report.omitted` with one of a closed set of reasons. Nothing may drop silently. tests/cv-export.test.ts enforces this on the real files.
import { toBlockData, safeUrl, PROJECT_TEXT_MAX, type BlockData } from '@/lib/blocks/adapt'
import { SOCIAL_FIELDS } from '@/lib/contact/items'
import type { PortfolioContent } from '@/components/templates/Minimal'

export type OmitReason =
  /** The person chose to leave e-mail, phone and WhatsApp out of this file. */
  | 'contact_excluded'
  /** A stored address is not a plain web address, so it is not printed (the public page drops it too). */
  | 'link_not_valid'
  /** More entries than the page shows; the extra ones are not printed (same limit as the public page). */
  | 'over_cap'
  /** An entry missing a required field (for example an award with no issuer), which the public page does not show either. */
  | 'incomplete_entry'
  /** A text longer than the page's own limit, cut at that limit. */
  | 'text_cut'
  /** Stored, but not drawn by the page either (for example skills outside the skill groups). */
  | 'not_shown_on_page'
  /** Not part of a CV by design (testimonials, the photo). */
  | 'not_cv_content'

export interface Omitted { section: string; item: string; reason: OmitReason }

export interface CvRole { company: string; role: string; period: string; bullets: string[] }
export interface CvProject { title: string; stack: string[]; problem: string; solution: string; outcome: string; url?: string; sourceUrl?: string }
export interface CvAward { title: string; issuer: string; year: string; description: string; url?: string }

export interface CvModel {
  name: string
  /** The role line, then the headline when it differs. */
  title: string[]
  /** e-mail, phone, WhatsApp, location: the line under the name. */
  contactLine: string[]
  /** LinkedIn, GitHub and the person's other public profiles, as "Label: address". */
  links: string[]
  summary: string[]
  experience: CvRole[]
  skills: Array<{ category: string; items: string[] }>
  projects: CvProject[]
  education: string[]
  certifications: string[]
  awards: CvAward[]
  /** The section order the layout uses. */
  order: CvSection[]
  /** "Generated from liveportfolio.site/name on 25 November 2026": goes into the file's metadata, never into the visible text. */
  provenance: string
}

export type CvSection = 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'certifications' | 'awards'

export interface CvReport {
  omitted: Omitted[]
  contactIncluded: boolean
}

export interface CvOptions {
  includeContact: boolean
  /** The portfolio address for the metadata, for example https://liveportfolio.site/ada. */
  url?: string
  now?: Date
}

const s = (v: unknown, max = 100000): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const short = (t: string) => (t.length > 48 ? `${t.slice(0, 45)}...` : t)

/** Section order. Experience comes before Skills when the person has experience; people without any lead with Education, Projects and Skills. */
export function sectionOrder(hasExperience: boolean): CvSection[] {
  return hasExperience
    ? ['summary', 'experience', 'skills', 'projects', 'education', 'certifications', 'awards']
    : ['summary', 'education', 'projects', 'skills', 'certifications', 'awards']
}

export function buildCvModel(content: Partial<PortfolioContent> | null | undefined, opts: CvOptions): { model: CvModel; report: CvReport } {
  const raw = (content ?? {}) as Record<string, unknown>
  const d: BlockData = toBlockData(content)
  const omitted: Omitted[] = []
  const note = (section: string, item: string, reason: OmitReason) => omitted.push({ section, item: short(item), reason })

  // ── header ──
  const contactByKind = new Map(d.contact.map((c) => [c.kind, c]))
  const privateKinds = ['email', 'phone', 'whatsapp'] as const
  const contactLine: string[] = []
  if (d.location) contactLine.push(d.location)
  for (const k of privateKinds) {
    const item = contactByKind.get(k)
    if (!item) continue
    if (opts.includeContact) contactLine.push(item.text)
    else note('contact', item.label, 'contact_excluded')
  }
  const links = d.contact.filter((c) => !(privateKinds as readonly string[]).includes(c.kind)).map((c) => `${c.label}: ${c.href}`)
  // A stored social address that is not a plain web address is dropped by the contact list; say so instead of dropping it silently.
  for (const [field, kind] of SOCIAL_FIELDS) {
    if (s(raw[field], 300) && !contactByKind.has(kind)) note('links', kind, 'link_not_valid')
  }

  // ── summary ──
  const aboutRaw = s(raw.about)
  if (aboutRaw.length > 6000) note('summary', 'about', 'text_cut')

  // ── experience ──
  const rawExp = arr<Record<string, unknown>>(raw.experience)
  rawExp.forEach((e) => {
    const label = [s(e?.role, 160), s(e?.company, 160)].filter(Boolean).join(' at ')
    if (!s(e?.company, 160) && !s(e?.role, 160)) {
      if (arr(e?.bullets).some((b) => s(b))) note('experience', 'an entry without a company or role', 'incomplete_entry')
      return
    }
    const bullets = arr(e?.bullets).map((b) => s(b)).filter(Boolean)
    if (bullets.length > 12) note('experience', `${label}: ${bullets.length - 12} more bullet(s)`, 'over_cap')
    bullets.slice(0, 12).forEach((b) => { if (b.length > 400) note('experience', b, 'text_cut') })
  })

  // ── projects ──
  const rawProjects = arr<Record<string, unknown>>(raw.projects)
  rawProjects.forEach((p) => {
    const title = s(p?.title, 160)
    if (!title) {
      if (s(p?.problem) || s(p?.solution) || s(p?.outcome)) note('projects', 'an entry without a title', 'incomplete_entry')
      return
    }
    for (const f of ['problem', 'solution', 'outcome'] as const) if (s(p?.[f]).length > PROJECT_TEXT_MAX) note('projects', `${title}: ${f}`, 'text_cut')
    if (arr(p?.stack).map((x) => s(x)).filter(Boolean).length > 12) note('projects', `${title}: stack`, 'over_cap')
    for (const f of ['url', 'github_url'] as const) if (s(p?.[f], 500) && !safeUrl(p?.[f])) note('projects', `${title}: ${f === 'url' ? 'link' : 'source link'}`, 'link_not_valid')
  })

  // ── skills: the page draws the skill groups, or the flat list when there are no groups ──
  const groupsRaw = arr<Record<string, unknown>>(raw.skills_grouped)
  const hasGroups = groupsRaw.some((g) => arr(g?.items).some((i) => s(i)))
  if (hasGroups) {
    const inGroups = new Set(groupsRaw.flatMap((g) => arr(g?.items)).map((i) => s(i, 60).toLowerCase()))
    for (const flat of arr(raw.skills).map((x) => s(x, 60)).filter(Boolean)) if (!inGroups.has(flat.toLowerCase())) note('skills', flat, 'not_shown_on_page')
    groupsRaw.forEach((g) => { const n = arr(g?.items).map((i) => s(i)).filter(Boolean).length; if (n > 30) note('skills', `${s(g?.category, 80) || 'a group'}: ${n - 30} more`, 'over_cap') })
  } else {
    const n = arr(raw.skills).map((x) => s(x)).filter(Boolean).length
    if (n > 30) note('skills', `${n - 30} more skill(s)`, 'over_cap')
  }

  // ── education, certifications, awards ──
  arr<Record<string, unknown>>(raw.education).forEach((e) => {
    if (!s(e?.degree, 160) && !s(e?.institution, 160) && (s(e?.year, 20) || s(e?.period, 60) || s(e?.grade, 60))) note('education', 'an entry without a degree or school', 'incomplete_entry')
  })
  const certs = arr(raw.certifications).map((c) => s(c)).filter(Boolean)
  if (certs.length > 12) note('certifications', `${certs.length - 12} more`, 'over_cap')

  const rawAwards = arr<Record<string, unknown>>(raw.awards)
  let awardsKept = 0
  rawAwards.forEach((a) => {
    const title = s(a?.title, 160)
    if (!title && !s(a?.issuer)) return
    if (!title || !s(a?.issuer, 160)) { note('awards', title || 'an entry without a title', 'incomplete_entry'); return }
    awardsKept += 1
    if (awardsKept > 20) { note('awards', title, 'over_cap'); return }
    if (s(a?.description).length > 400) note('awards', `${title}: description`, 'text_cut')
    if (s(a?.url, 500) && !d.awards.find((x) => x.title === title)?.url) note('awards', `${title}: link`, 'link_not_valid')
  })

  // ── by design ──
  if (d.quotes.length) note('testimonials', `${d.quotes.length} testimonial(s)`, 'not_cv_content')
  if (d.avatarUrl) note('photo', 'profile photo', 'not_cv_content')

  const hasExperience = d.experience.length > 0
  const base = opts.url ? opts.url.replace(/^https?:\/\//, '') : ''
  const date = (opts.now ?? new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const model: CvModel = {
    name: d.name,
    title: [d.role, d.headline && d.headline !== d.role ? d.headline : ''].filter(Boolean),
    contactLine,
    links,
    summary: d.about,
    experience: d.experience.map((e) => ({ ...e })),
    skills: d.skillGroups.map((g) => ({ ...g })),
    projects: d.projects.map((p) => ({ title: p.title, stack: p.stack, problem: p.problem, solution: p.solution, outcome: p.outcome, url: p.url, sourceUrl: p.sourceUrl })),
    education: d.education,
    certifications: d.certifications,
    awards: d.awards.map((a) => ({ ...a })),
    order: sectionOrder(hasExperience),
    provenance: `Generated from ${base || 'liveportfolio.site'} on ${date}`,
  }
  return { model, report: { omitted, contactIncluded: opts.includeContact } }
}

/** The section headings, in the plain words applicant tracking systems look for. */
export const SECTION_TITLE: Record<CvSection, string> = {
  summary: 'Summary', experience: 'Experience', skills: 'Skills', projects: 'Projects', education: 'Education', certifications: 'Certifications', awards: 'Awards',
}

/** Is there anything to print under this section? Empty sections are not drawn (no empty headings). */
export function hasSection(m: CvModel, k: CvSection): boolean {
  switch (k) {
    case 'summary': return m.summary.length > 0
    case 'experience': return m.experience.length > 0
    case 'skills': return m.skills.length > 0
    case 'projects': return m.projects.length > 0
    case 'education': return m.education.length > 0
    case 'certifications': return m.certifications.length > 0
    case 'awards': return m.awards.length > 0
  }
}
