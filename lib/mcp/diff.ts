// Human-readable before/after for the approval page, and warnings when a saved change will not be fully visible on the public page.
// Pure: no I/O. Never includes contact details (email, phone, WhatsApp).
type Json = Record<string, unknown>

const LABELS: Record<string, string> = {
  name: 'Name', role: 'Role', headline: 'Headline', about: 'About', location: 'Location', skills: 'Skills', skills_grouped: 'Skill groups',
  skills_narrative: 'Skills sentence', projects: 'Projects', experience: 'Experience', education: 'Education', certifications: 'Certifications',
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

/** What the public page shows today. Verified in components/blocks/blocks.tsx: project stack shows the first 5 items; in the "index" arrangement a role shows its first bullet only. */
export const DISPLAY_LIMITS = { project_stack_items_shown: 5, role_bullets_shown: 'all, except the "index" arrangement which shows the first bullet only' } as const

export function displayWarnings(content: Json): string[] {
  const out: string[] = []
  const projects = Array.isArray(content.projects) ? (content.projects as Json[]) : []
  projects.forEach((p, i) => {
    const stack = Array.isArray(p.stack) ? p.stack : []
    if (stack.length > DISPLAY_LIMITS.project_stack_items_shown) out.push(`Project ${i + 1} "${String(p.title ?? '')}": only the first ${DISPLAY_LIMITS.project_stack_items_shown} of its ${stack.length} stack items are shown on the public page (the rest are saved). Put the most important ones first.`)
    if (typeof p.outcome === 'string' && p.outcome.trim() && p.outcome.trim() === String(p.solution ?? '').trim()) out.push(`Project ${i + 1} "${String(p.title ?? '')}": the outcome is identical to the solution, so the page repeats the same text. Ask the person for a real result, or shorten it.`)
  })
  const arrangement = (content.layout as Json | undefined)?.arrangement
  if (arrangement === 'index') {
    const roles = Array.isArray(content.experience) ? (content.experience as Json[]) : []
    roles.forEach((r, i) => { const b = Array.isArray(r.bullets) ? r.bullets : []; if (b.length > 1) out.push(`Role ${i + 1} (${String(r.company ?? '')}): this layout shows only the first of its ${b.length} highlight lines. Put the strongest one first, or switch the layout.`) })
  }
  return out.slice(0, 4)
}
