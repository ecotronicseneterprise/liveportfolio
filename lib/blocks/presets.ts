// Presets: which blocks, in which variant, in which order (an ARRANGEMENT), and the deterministic choice of one for a person.
// No model call and no randomness: the same person always gets the same default, and the dashboard can offer the others.
import type { PortfolioContent } from '@/components/templates/Minimal'
import { ARRANGEMENTS, defaultLayout, type Arrangement, type LayoutSettings } from './settings'

// ── themes follow the template id ────────────────────────────────────────────────────────────────────────
// The three FREE templates ARE the three looks, so plan gating, the template picker and /api/update need no change.
export type Theme = 'studio' | 'journal' | 'ledger'
export const THEMES: readonly Theme[] = ['studio', 'journal', 'ledger']
export const THEME_BY_TEMPLATE = { creative: 'studio', minimal: 'journal', bold: 'ledger' } as const
export const TEMPLATE_BY_THEME = { studio: 'creative', journal: 'minimal', ledger: 'bold' } as const
export type LookTemplate = keyof typeof THEME_BY_TEMPLATE
export const isLookTemplate = (v: unknown): v is LookTemplate => v === 'creative' || v === 'minimal' || v === 'bold'
export const themeForTemplate = (template: string): Theme | null => (isLookTemplate(template) ? THEME_BY_TEMPLATE[template] : null)

// ── arrangements ─────────────────────────────────────────────────────────────────────────────────────────
export type BlockName = 'hero' | 'about' | 'projects' | 'experience' | 'skills' | 'credentials' | 'quote' | 'social-links' | 'contact'
export interface SectionSpec { block: BlockName; variant: string }
const s = (block: BlockName, variant: string): SectionSpec => ({ block, variant })

export const ARRANGEMENT_SECTIONS: Record<Arrangement, SectionSpec[]> = {
  proof: [s('hero', 'statement'), s('projects', 'proof'), s('about', 'short'), s('experience', 'timeline'), s('skills', 'groups'), s('credentials', 'inline'), s('quote', 'pull'), s('social-links', 'inline'), s('contact', 'band')],
  profile: [s('hero', 'split'), s('about', 'prose'), s('projects', 'rows'), s('experience', 'timeline'), s('skills', 'groups'), s('credentials', 'list'), s('quote', 'pull'), s('contact', 'plain')],
  index: [s('hero', 'compact'), s('projects', 'index'), s('experience', 'table'), s('about', 'columns'), s('skills', 'inline'), s('credentials', 'inline'), s('social-links', 'inline'), s('contact', 'plain')],
  showcase: [s('hero', 'statement'), s('projects', 'grid'), s('about', 'columns'), s('skills', 'inline'), s('experience', 'timeline'), s('credentials', 'inline'), s('quote', 'band'), s('social-links', 'stacked'), s('contact', 'band')],
}

// ── who is this person? (from the role text; deliberately coarse) ────────────────────────────────────────
export type Kind = 'engineer' | 'finance' | 'clinician' | 'designer' | 'other'
export function kindFromRole(role: string | undefined | null): Kind {
  const r = (role ?? '').toLowerCase()
  if (!r.trim()) return 'other'
  if (/physio|doctor|nurs|clinic|therap|pharmac|dentist|medical|midwife|surgeon|radiolog|optomet|nutrition|dietit/.test(r)) return 'clinician'
  if (/design|ux\b|\bui\b|illustrat|artist|creative|brand|motion|photograph|art director/.test(r)) return 'designer'
  if (/financ|account|audit|tax|bank|actuar|treasur|invest|fp&a|\bcfo\b|credit|risk/.test(r)) return 'finance'
  if (/engineer|develop|software|devops|\bdata\b|machine learning|\bml\b|security|cyber|backend|frontend|full.?stack|programmer|\bqa\b|\bsre\b|architect|cloud|scientist/.test(r)) return 'engineer'
  return 'other'
}

const AFFINITY: Record<Kind, Record<Arrangement, number>> = {
  engineer: { proof: 3, index: 3, profile: 2, showcase: 1 },
  finance: { proof: 3, profile: 2, index: 2, showcase: 0 },
  clinician: { profile: 3, proof: 2, index: 1, showcase: 0 },
  designer: { showcase: 3, profile: 2, proof: 2, index: 1 },
  other: { profile: 3, proof: 2, index: 1, showcase: 1 },
}
const THEME_AFFINITY: Record<Kind, Record<Theme, number>> = {
  engineer: { ledger: 2, studio: 2, journal: 0 },
  finance: { ledger: 2, studio: 1, journal: 1 },
  clinician: { journal: 2, studio: 1, ledger: 0 },
  designer: { journal: 2, studio: 1, ledger: 1 },
  other: { studio: 2, journal: 2, ledger: 0 },
}
const hasFigure = (v: string) => /\d/.test(v)

/** Facts about the CONTENT that move the choice. All derived from what the person wrote; nothing is invented. */
export function facts(c: Partial<PortfolioContent> | null | undefined) {
  const projects = Array.isArray(c?.projects) ? c!.projects! : []
  return {
    withFigures: projects.filter((p) => typeof p?.outcome === 'string' && hasFigure(p.outcome)).length,
    withImages: projects.filter((p) => typeof p?.image_url === 'string' && p.image_url).length,
    projects: projects.length,
  }
}

export interface Ranked { theme: Theme; arrangement: Arrangement; template: LookTemplate; score: number }

/** All 12 looks, best first. Deterministic: score, then a fixed order. */
export function rank(c: Partial<PortfolioContent> | null | undefined): Ranked[] {
  const kind = kindFromRole(c?.role)
  const f = facts(c)
  const out: Ranked[] = []
  for (const theme of THEMES) for (const arrangement of ARRANGEMENTS) {
    let score = AFFINITY[kind][arrangement] * 10 + THEME_AFFINITY[kind][theme] * 3
    if (arrangement === 'proof') score += Math.min(f.withFigures, 3) - (f.withFigures === 0 ? 8 : 0)
    if (arrangement === 'showcase') score += f.withImages * 2 - (f.withImages === 0 ? 12 : 0)
    // theme B (Studio, "Proof") is the lead look for anyone whose results carry figures
    if (theme === 'studio' && f.withFigures >= 2) score += 6
    if (arrangement === 'index' && f.projects === 0) score -= 6 // an index of nothing is the emptiest page
    out.push({ theme, arrangement, template: TEMPLATE_BY_THEME[theme], score })
  }
  return out.sort((a, b) => b.score - a.score || THEMES.indexOf(a.theme) - THEMES.indexOf(b.theme) || ARRANGEMENTS.indexOf(a.arrangement) - ARRANGEMENTS.indexOf(b.arrangement))
}

/** The best look overall: the template to preselect and the layout to store for a NEW portfolio. */
export function recommend(c: Partial<PortfolioContent> | null | undefined): { template: LookTemplate; layout: LayoutSettings } {
  const top = rank(c)[0]
  return { template: top.template, layout: defaultLayout(top.arrangement) }
}

/** The layout for a NEW portfolio whose template is already chosen: the best arrangement for that look. Null for a Pro template (legacy). */
export function layoutForTemplate(c: Partial<PortfolioContent> | null | undefined, template: string): LayoutSettings | null {
  const theme = themeForTemplate(template)
  if (!theme) return null
  const best = rank(c).find((r) => r.theme === theme)!
  return defaultLayout(best.arrangement)
}
