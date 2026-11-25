// Human-readable before/after for the approval page, and warnings when a saved change will not be fully visible on the public page.
// Pure: no I/O. Never includes contact details (email, phone, WhatsApp).
import { PRO_TEMPLATES } from '@/lib/plans'
type Json = Record<string, unknown>
const PRO_IDS = new Set<string>(PRO_TEMPLATES)

const LABELS: Record<string, string> = {
  name: 'Name', role: 'Role', headline: 'Headline', about: 'About', location: 'Location', skills: 'Skills', skills_grouped: 'Skill groups',
  skills_narrative: 'Skills sentence', projects: 'Projects', experience: 'Experience', education: 'Education', certifications: 'Certifications', awards: 'Awards',
  testimonials: 'Testimonials', layout: 'Look', pro_designs: 'Pro designs', github_url: 'GitHub link', linkedin_url: 'LinkedIn link',
  twitter_url: 'X link', instagram_url: 'Instagram link', facebook_url: 'Facebook link', youtube_url: 'YouTube link', tiktok_url: 'TikTok link',
  website_url: 'Website link', avatar_url: 'Profile photo',
}
const HIDDEN = new Set(['email', 'phone', 'whatsapp', 'seo_title', 'seo_description'])

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s)
function itemLabel(x: unknown): string {
  if (typeof x === 'string') return x
  if (x && typeof x === 'object') {
    const o = x as Json
    for (const k of ['title', 'company', 'degree', 'category', 'author']) if (typeof o[k] === 'string' && o[k]) return `${o[k]}${k === 'company' && o.role ? ` (${o.role})` : ''}`
  }
  return 'item'
}
function show(v: unknown): string {
  if (v === undefined || v === null || v === '') return '(empty)'
  if (typeof v === 'string') return clip(v)
  if (Array.isArray(v)) return v.length ? clip(v.map(itemLabel).join(', ')) : '(empty)'
  return clip(JSON.stringify(v))
}

export interface Change { label: string; before: string; after: string }

export function describeChanges(before: Json, after: Json, templateBefore?: string, templateAfter?: string): Change[] {
  const out: Change[] = []
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (HIDDEN.has(k)) continue
    if (JSON.stringify(before[k] ?? null) === JSON.stringify(after[k] ?? null)) continue
    out.push({ label: LABELS[k] ?? k, before: show(before[k]), after: show(after[k]) })
  }
  if (templateBefore !== undefined && templateAfter !== undefined && templateBefore !== templateAfter) out.push({ label: 'Design', before: templateBefore, after: templateAfter })
  return out.slice(0, 12)
}

/** What the public page shows. Verified in components/blocks/blocks.tsx: the free designs draw every stack item, bullet, testimonial and paragraph; on a phone (640px and below) long lists are folded behind a labelled control, never removed. */
export const DISPLAY_LIMITS = {
  project_stack_items_shown: 'all (on a phone the first 5, then a "+N more" control)',
  role_bullets_shown: 'all (on a phone the first 3, then a "Show N more" control)',
  testimonials_shown: 'all (on a phone the first 3, then a "Show N more" control)',
  project_dashboard_embed: 'an interactive Power BI report is shown under the project picture on the free designs only; the Pro designs show the picture',
  skills_shown: 'the skill groups when there are any; otherwise the flat skills list',
} as const

export function displayWarnings(content: Json, template?: string): string[] {
  const out: string[] = []
  const projects = Array.isArray(content.projects) ? (content.projects as Json[]) : []
  projects.forEach((p, i) => {
    if (template && PRO_IDS.has(template) && typeof p.embed_url === 'string' && p.embed_url) out.push(`Project ${i + 1} "${String(p.title ?? '')}": the interactive dashboard is saved but this Pro design shows the picture only. The free designs show it.`)
    if (typeof p.outcome === 'string' && p.outcome.trim() && p.outcome.trim() === String(p.solution ?? '').trim()) out.push(`Project ${i + 1} "${String(p.title ?? '')}": the outcome is identical to the solution, so the page repeats the same text. Ask the person for a real result, or shorten it.`)
  })
  const groups = Array.isArray(content.skills_grouped) ? (content.skills_grouped as Json[]) : []
  const flat = Array.isArray(content.skills) ? (content.skills as unknown[]).filter((x): x is string => typeof x === 'string') : []
  if (groups.length) {
    const inGroups = new Set(groups.flatMap((g) => (Array.isArray(g.items) ? g.items : []).map((x) => String(x).toLowerCase().trim())))
    const hidden = flat.filter((x) => !inGroups.has(x.toLowerCase().trim()))
    if (hidden.length) out.push(`The public page shows skill groups, so ${hidden.length} skill(s) that are only in the flat list are not shown: ${hidden.slice(0, 5).join(', ')}. Add them to a group with portfolio_add_skill_to_group.`)
  }
  return out.slice(0, 5)
}
