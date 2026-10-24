// Typed operations on a portfolio. This is the ONLY way portfolio content changes after generation: the dashboard save, the
// undo/restore routes and, later, the assistant's tools all go through applyOps, so every edit is validated the same way and
// produces the same human-readable change list (shown in History and stored with each revision).
//
// Pure: no I/O, no clock, never mutates its input. Throws OpError (with the index of the offending op) and changes nothing.
//
// Deliberately NOT here: publishing, plans, the slug, the email address of the account. Those are not "content".
import { z } from 'zod'
import { httpUrl, isGithubAvatarUrl, projectImageUrl } from '@/lib/connectors/safe-url'

export type Json = Record<string, unknown>
export interface PortfolioState {
  content: Json
  template: string
}

export class OpError extends Error {
  constructor(public code: 'invalid_op' | 'out_of_range' | 'limit', message: string, public index: number) {
    super(message)
  }
}

// ── field catalogue ──────────────────────────────────────────────────────────────────────────────────────────
export const TEXT_LIMITS = { name: 100, role: 160, headline: 200, about: 6000, location: 120, email: 254, skills_narrative: 400 } as const
export type TextField = keyof typeof TEXT_LIMITS
export const TEXT_FIELDS = Object.keys(TEXT_LIMITS) as [TextField, ...TextField[]]
export const LINK_FIELDS = ['github_url', 'linkedin_url', 'avatar_url'] as const

/** Every key the dashboard may send. Anything else is dropped silently (as the route always did). */
export const CONTENT_KEYS = [
  'name', 'role', 'about', 'headline', 'location', 'email', 'github_url', 'linkedin_url', 'avatar_url',
  'skills', 'skills_grouped', 'skills_narrative', 'projects', 'experience', 'education', 'certifications',
] as const
const ARRAY_KEYS = new Set(['skills', 'skills_grouped', 'projects', 'experience', 'education', 'certifications'])
const MAX_ITEMS = 50

export const MAX_PROJECTS_ADD = 6
export const MAX_EXPERIENCE_ADD = 10
export const MAX_OPS = 20

// ── validators for single values ─────────────────────────────────────────────────────────────────────────────
const str = (max: number) => z.string().max(max)
const optionalLink = z.string().max(500)

const ProjectInput = z
  .object({
    title: str(120),
    problem: str(600).default(''),
    solution: str(600).default(''),
    outcome: str(600).default(''),
    stack: z.array(str(40)).max(12).default([]),
    url: optionalLink.optional(),
    github_url: optionalLink.optional(),
    image_url: optionalLink.optional(),
  })
  .strict()
// Patches are written out WITHOUT defaults on purpose. Building them with .partial() from the schemas above would fill every field a
// patch does not mention with its default under zod 4 (".default() applies inside optional fields"), silently wiping data.
const ProjectPatch = z
  .object({
    title: str(120).optional(),
    problem: str(600).optional(),
    solution: str(600).optional(),
    outcome: str(600).optional(),
    stack: z.array(str(40)).max(12).optional(),
    url: optionalLink.optional(),
    github_url: optionalLink.optional(),
    image_url: optionalLink.optional(),
  })
  .strict()
const ExperienceInput = z
  .object({ company: str(120), role: str(120), period: str(60).default(''), bullets: z.array(str(400)).max(12).default([]) })
  .strict()
const ExperiencePatch = z
  .object({ company: str(120).optional(), role: str(120).optional(), period: str(60).optional(), bullets: z.array(str(400)).max(12).optional() })
  .strict()
const EducationInput = z.object({ degree: str(160), institution: str(160), year: str(20).default(''), grade: str(60).optional() }).strict()
const Group = z.object({ category: str(60), items: z.array(str(60)).max(20) }).strict()

const idx = z.number().int().min(0).max(99)

export const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('set_field'), field: z.enum(TEXT_FIELDS), value: z.string() }).strict(),
  z.object({ op: z.literal('set_link'), field: z.enum(LINK_FIELDS), value: z.string().max(500) }).strict(),
  z.object({ op: z.literal('set_skills'), skills: z.array(str(60)).max(15) }).strict(),
  z.object({ op: z.literal('set_skills_grouped'), groups: z.array(Group).max(8) }).strict(),
  z.object({ op: z.literal('add_project'), project: ProjectInput, index: idx.optional() }).strict(),
  z.object({ op: z.literal('update_project'), index: idx, patch: ProjectPatch }).strict(),
  z.object({ op: z.literal('remove_project'), index: idx }).strict(),
  z.object({ op: z.literal('move_project'), from: idx, to: idx }).strict(),
  z.object({ op: z.literal('add_experience'), experience: ExperienceInput, index: idx.optional() }).strict(),
  z.object({ op: z.literal('update_experience'), index: idx, patch: ExperiencePatch }).strict(),
  z.object({ op: z.literal('remove_experience'), index: idx }).strict(),
  z.object({ op: z.literal('move_experience'), from: idx, to: idx }).strict(),
  z.object({ op: z.literal('set_education'), education: z.array(EducationInput).max(6) }).strict(),
  z.object({ op: z.literal('set_certifications'), certifications: z.array(str(160)).max(12) }).strict(),
  // The dashboard's "Save" sends whole sections; this is that, validated for shape. The assistant is not given this op.
  z.object({ op: z.literal('replace_content'), content: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ op: z.literal('set_template'), template: z.string().max(40) }).strict(),
])
export type Op = z.infer<typeof Op>
export const Ops = z.array(Op).min(1).max(MAX_OPS)

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null))
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const stripBulletMarker = (s: string) => s.replace(/^[\s▸•→\-\*▶‣◦]+/, '').trim()
const cleanBullets = (b: string[]) => b.map(stripBulletMarker).filter((x) => x.length > 0 && !x.endsWith(':'))
const trim = (s: string) => s.trim()

/** A link a person may SET. The value already stored is always accepted unchanged, so saving other edits never fails on old data. */
function checkLink(field: (typeof LINK_FIELDS)[number] | 'url' | 'image_url', value: string, current: unknown, i: number): string {
  const v = value.trim()
  if (v === '') return ''
  if (typeof current === 'string' && v === current) return v
  const bad = () => new OpError('invalid_op', `${field} is not an acceptable link`, i)
  if (field === 'avatar_url') {
    const out = projectImageUrl(v, undefined, 'avatars') || (isGithubAvatarUrl(v) ? v : '')
    if (!out) throw bad()
    return out
  }
  if (field === 'image_url') {
    const out = projectImageUrl(v)
    if (!out) throw bad()
    return out
  }
  const out = httpUrl(v)
  if (!out) throw bad()
  return out
}

function checkProjectLinks<T extends Json>(p: T, current: Json | undefined, i: number): T {
  const out: Json = { ...p }
  for (const k of ['url', 'github_url', 'image_url'] as const) {
    if (typeof out[k] === 'string') {
      const v = checkLink(k, out[k] as string, current?.[k], i)
      if (v) out[k] = v
      else delete out[k]
    }
  }
  return out as T
}

const list = (state: Json, key: string): Json[] => (Array.isArray(state[key]) ? (state[key] as Json[]) : [])
function at(arr: unknown[], index: number, i: number, what: string) {
  if (!Number.isInteger(index) || index < 0 || index >= arr.length) throw new OpError('out_of_range', `${what} ${index + 1} does not exist`, i)
}
const projectName = (p: Json | undefined) => (typeof p?.title === 'string' && p.title ? `"${String(p.title).slice(0, 40)}"` : '')

/** Light shape check for the dashboard's whole-section saves. Unknown keys are dropped; wrong types are refused. */
function cleanContentPatch(raw: Record<string, unknown>, i: number): Json {
  const out: Json = {}
  for (const k of CONTENT_KEYS) {
    if (!(k in raw)) continue
    const v = raw[k]
    if (ARRAY_KEYS.has(k)) {
      if (!Array.isArray(v) || v.length > MAX_ITEMS) throw new OpError('invalid_op', `${k} must be a list of at most ${MAX_ITEMS}`, i)
      out[k] = v
    } else if (typeof v === 'string') {
      const max = (TEXT_LIMITS as Record<string, number>)[k] ?? 500
      if (v.length > max * 2) throw new OpError('invalid_op', `${k} is too long`, i)
      out[k] = v
    } else if (v === null || v === undefined) {
      // an explicit null clears optional links only
      if (k.endsWith('_url')) out[k] = ''
    } else throw new OpError('invalid_op', `${k} must be text`, i)
  }
  if (Array.isArray(out.experience)) {
    out.experience = (out.experience as Array<{ bullets?: unknown[] }>).map((e) => ({
      ...e,
      bullets: Array.isArray(e?.bullets) ? cleanBullets(e.bullets.map((b) => String(b))) : e?.bullets,
    }))
  }
  return out
}

export interface ApplyResult {
  state: PortfolioState
  /** Short human sentences, one per real change ("Changed headline", "Added project "X""). Empty when nothing changed. */
  changes: string[]
}

/** Applies the operations in order. All or nothing: any invalid op throws and nothing is returned. */
export function applyOps(input: PortfolioState, rawOps: unknown): ApplyResult {
  const parsed = Ops.safeParse(rawOps)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const index = typeof first?.path[0] === 'number' ? (first.path[0] as number) : 0
    throw new OpError('invalid_op', `invalid operation: ${first?.path.join('.') || 'ops'} ${first?.message ?? ''}`.trim(), index)
  }
  const state: PortfolioState = { content: clone(input.content) as Json, template: input.template }
  const changes: string[] = []
  const note = (s: string) => { if (!changes.includes(s)) changes.push(s) }

  parsed.data.forEach((op, i) => {
    const c = state.content
    switch (op.op) {
      case 'set_field': {
        const v = trim(op.value)
        if (v.length > TEXT_LIMITS[op.field]) throw new OpError('limit', `${op.field} is limited to ${TEXT_LIMITS[op.field]} characters`, i)
        if (op.field === 'name' && !v) throw new OpError('invalid_op', 'name cannot be empty', i)
        if (!same(c[op.field], v)) { c[op.field] = v; note(`Changed ${op.field.replace('_', ' ')}`) }
        break
      }
      case 'set_link': {
        const v = checkLink(op.field, op.value, c[op.field], i)
        if (!same(c[op.field] ?? '', v)) {
          if (v) c[op.field] = v
          else delete c[op.field]
          note(v ? `Changed ${op.field.replace('_url', '')} link` : `Removed ${op.field.replace('_url', '')} link`)
        }
        break
      }
      case 'set_skills': {
        const v = op.skills.map(trim).filter(Boolean)
        if (!same(c.skills, v)) { c.skills = v; note('Changed skills') }
        break
      }
      case 'set_skills_grouped': {
        const v = op.groups.map((g) => ({ category: trim(g.category), items: g.items.map(trim).filter(Boolean) })).filter((g) => g.category && g.items.length)
        if (!same(c.skills_grouped, v)) { c.skills_grouped = v; note('Changed skill groups') }
        break
      }
      case 'add_project': {
        const arr = list(c, 'projects')
        if (arr.length >= MAX_PROJECTS_ADD) throw new OpError('limit', `at most ${MAX_PROJECTS_ADD} projects`, i)
        if (!op.project.title.trim()) throw new OpError('invalid_op', 'a project needs a title', i)
        const p = checkProjectLinks({ ...op.project, title: trim(op.project.title) } as Json, undefined, i)
        const at_ = Math.min(op.index ?? arr.length, arr.length)
        c.projects = [...arr.slice(0, at_), p, ...arr.slice(at_)]
        note(`Added project ${projectName(p)}`.trim())
        break
      }
      case 'update_project': {
        const arr = list(c, 'projects')
        at(arr, op.index, i, 'project')
        const cur = arr[op.index]
        const patch = checkProjectLinks(op.patch as Json, cur, i)
        const next = { ...cur, ...patch }
        if (typeof next.title === 'string' && !next.title.trim()) throw new OpError('invalid_op', 'a project needs a title', i)
        if (!same(cur, next)) { c.projects = arr.map((p, k) => (k === op.index ? next : p)); note(`Edited project ${projectName(next)}`.trim()) }
        break
      }
      case 'remove_project': {
        const arr = list(c, 'projects')
        at(arr, op.index, i, 'project')
        note(`Removed project ${projectName(arr[op.index])}`.trim())
        c.projects = arr.filter((_, k) => k !== op.index)
        break
      }
      case 'move_project': {
        const arr = [...list(c, 'projects')]
        at(arr, op.from, i, 'project'); at(arr, op.to, i, 'position')
        if (op.from !== op.to) { const [m] = arr.splice(op.from, 1); arr.splice(op.to, 0, m); c.projects = arr; note('Reordered projects') }
        break
      }
      case 'add_experience': {
        const arr = list(c, 'experience')
        if (arr.length >= MAX_EXPERIENCE_ADD) throw new OpError('limit', `at most ${MAX_EXPERIENCE_ADD} roles`, i)
        const e = { ...op.experience, bullets: cleanBullets(op.experience.bullets) }
        const at_ = Math.min(op.index ?? arr.length, arr.length)
        c.experience = [...arr.slice(0, at_), e, ...arr.slice(at_)]
        note(`Added role ${e.company ? `at "${e.company.slice(0, 40)}"` : ''}`.trim())
        break
      }
      case 'update_experience': {
        const arr = list(c, 'experience')
        at(arr, op.index, i, 'role')
        const patch: Json = { ...op.patch }
        if (Array.isArray(patch.bullets)) patch.bullets = cleanBullets(patch.bullets as string[])
        const next = { ...arr[op.index], ...patch }
        if (!same(arr[op.index], next)) { c.experience = arr.map((e, k) => (k === op.index ? next : e)); note(`Edited role ${next.company ? `at "${String(next.company).slice(0, 40)}"` : ''}`.trim()) }
        break
      }
      case 'remove_experience': {
        const arr = list(c, 'experience')
        at(arr, op.index, i, 'role')
        note(`Removed role ${arr[op.index].company ? `at "${String(arr[op.index].company).slice(0, 40)}"` : ''}`.trim())
        c.experience = arr.filter((_, k) => k !== op.index)
        break
      }
      case 'move_experience': {
        const arr = [...list(c, 'experience')]
        at(arr, op.from, i, 'role'); at(arr, op.to, i, 'position')
        if (op.from !== op.to) { const [m] = arr.splice(op.from, 1); arr.splice(op.to, 0, m); c.experience = arr; note('Reordered experience') }
        break
      }
      case 'set_education': {
        if (!same(c.education, op.education)) { c.education = op.education; note('Changed education') }
        break
      }
      case 'set_certifications': {
        const v = op.certifications.map(trim).filter(Boolean)
        if (!same(c.certifications, v)) { c.certifications = v; note('Changed certifications') }
        break
      }
      case 'replace_content': {
        const patch = cleanContentPatch(op.content, i)
        if (Array.isArray(patch.projects)) {
          // a project image is rendered as an <img>: it must be one of our own uploads, or already stored on this portfolio
          const stored = new Set(list(c, 'projects').map((p) => p.image_url).filter((u): u is string => typeof u === 'string'))
          patch.projects = (patch.projects as Json[]).map((p) => {
            if (!p || typeof p !== 'object') throw new OpError('invalid_op', 'each project must be an object', i)
            const img = p.image_url
            if (typeof img !== 'string' || img === '') { const { image_url: _drop, ...rest } = p; return rest }
            if (stored.has(img) || projectImageUrl(img)) return p
            throw new OpError('invalid_op', 'image_url is not an acceptable link', i)
          })
        }
        for (const [k, v] of Object.entries(patch)) {
          if (k.endsWith('_url') && typeof v === 'string') {
            const checked = checkLink(k as 'github_url', v, c[k], i)
            if (!same(c[k] ?? '', checked)) { if (checked) c[k] = checked; else delete c[k]; note(`Changed ${k.replace('_url', '')} link`) }
            continue
          }
          if (!same(c[k], v)) {
            c[k] = v
            note(Array.isArray(v) ? `Changed ${k.replace('_', ' ')}` : `Changed ${k.replace('_', ' ')}`)
          }
        }
        break
      }
      case 'set_template': {
        if (state.template !== op.template) { state.template = op.template; note('Changed template') }
        break
      }
    }
  })
  return { state, changes }
}
