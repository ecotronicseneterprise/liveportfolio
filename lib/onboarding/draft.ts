// The onboarding draft lives in localStorage so a closed tab or a retry does not lose the reviewed content.
// It is readable by any script on the page and lingers on shared computers, so:
//   - it stores ONLY the reviewed profile fields below, field by field (an allow-list copy, never a spread);
//     raw CV text, files, tokens, the password and the e-mail address are structurally impossible to store;
//   - every string is length-capped and every URL must be http(s);
//   - it is cleared after generation and on sign-out (signOutAndClear / the SIGNED_OUT listener in the flow hook).

import { httpUrl, projectImageUrl } from '@/lib/connectors/safe-url'
import type { ImportDraft, ProjectCandidate } from '@/lib/connectors/types'

export const DRAFT_KEY = 'lp_draft_v1'

export interface DraftProject { title: string; description: string; stack: string; url: string; image_url?: string }
export interface DraftExperience { company: string; role: string; period: string; bullets: string }
export interface DraftEducation { degree: string; institution: string; year: string; grade: string }
export interface DraftCandidate {
  id: string; title: string; description: string; stack: string[]; repo_url: string; live_url: string | null; selected: boolean
}

export interface Draft {
  v: 1
  status: 'imported' | 'reviewed'
  name: string
  role: string
  location: string
  bio: string
  github_url: string
  linkedin_url: string
  skills: string[]
  certifications: string[]
  projects: DraftProject[]
  experience: DraftExperience[]
  education: DraftEducation[]
  template: string
  candidates: DraftCandidate[]
}

const s = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : ''
const list = (v: unknown, n: number, max: number): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of v) {
    const t = s(x, max)
    const k = t.toLowerCase()
    if (t && !seen.has(k)) { seen.add(k); out.push(t) }
    if (out.length >= n) break
  }
  return out
}
const arr = (v: unknown, n: number): unknown[] => (Array.isArray(v) ? v.slice(0, n) : [])
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const urlOrEmpty = (v: unknown): string => httpUrl(v) ?? ''

/**
 * Allow-list copy. Anything not named here (rawText, text, cv, file, password, email, token, …) is dropped.
 * Returns null when the input is not an object at all.
 */
export function sanitizeDraft(input: unknown): Draft | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const d = rec(input)
  return {
    v: 1,
    status: d.status === 'reviewed' ? 'reviewed' : 'imported',
    name: s(d.name, 80),
    role: s(d.role, 80),
    location: s(d.location, 80),
    bio: s(d.bio, 500),
    github_url: urlOrEmpty(d.github_url),
    linkedin_url: urlOrEmpty(d.linkedin_url),
    skills: list(d.skills, 15, 50),
    certifications: list(d.certifications, 20, 80),
    projects: arr(d.projects, 4).map((p) => {
      const r = rec(p)
      return {
        title: s(r.title, 80),
        description: s(r.description, 200),
        stack: Array.isArray(r.stack) ? list(r.stack, 10, 30).join(', ') : s(r.stack, 200),
        url: urlOrEmpty(r.url),
        ...(projectImageUrl(r.image_url) ? { image_url: projectImageUrl(r.image_url) } : {}),
      }
    }),
    experience: arr(d.experience, 10).map((e) => {
      const r = rec(e)
      const bullets = Array.isArray(r.bullets) ? list(r.bullets, 4, 200).join('\n') : s(r.bullets, 900)
      return { company: s(r.company, 80), role: s(r.role, 80), period: s(r.period, 40), bullets }
    }),
    education: arr(d.education, 3).map((e) => {
      const r = rec(e)
      return { degree: s(r.degree, 100), institution: s(r.institution, 100), year: s(r.year, 20), grade: s(r.grade, 40) }
    }),
    template: /^[a-z][a-z-]{1,29}$/.test(typeof d.template === 'string' ? d.template : '') ? (d.template as string) : 'minimal',
    candidates: arr(d.candidates, 10)
      .map((c): DraftCandidate => {
        const r = rec(c)
        return {
          id: s(r.id, 120), title: s(r.title, 80), description: s(r.description, 200),
          stack: list(r.stack, 6, 30), repo_url: urlOrEmpty(r.repo_url), live_url: urlOrEmpty(r.live_url) || null,
          selected: r.selected === true,
        }
      })
      .filter((c) => c.id && c.title),
  }
}

/** ImportDraft (connector output) → the stored draft. The e-mail is NOT kept: it comes from the signed-in account. */
export function draftFromImport(imp: Partial<ImportDraft>, prev?: Draft | null): Draft {
  const base: Draft = prev ?? sanitizeDraft({})!
  const merged = sanitizeDraft({
    ...base,
    status: 'imported',
    name: imp.name || base.name,
    role: imp.role || base.role,
    location: imp.location || base.location,
    bio: imp.bio || base.bio,
    github_url: imp.github_url || base.github_url,
    linkedin_url: imp.linkedin_url || base.linkedin_url,
    skills: imp.skills?.length ? [...base.skills, ...imp.skills] : base.skills,
    certifications: imp.certifications?.length ? [...base.certifications, ...imp.certifications] : base.certifications,
    projects: imp.projects?.length ? imp.projects : base.projects,
    experience: imp.experience?.length ? imp.experience : base.experience,
    education: imp.education?.length ? imp.education : base.education,
    candidates: imp.project_candidates?.length ? (imp.project_candidates as ProjectCandidate[]) : base.candidates,
  })
  return merged!
}

export interface KeyValueStore {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export function createDraftStore(storage: KeyValueStore | null) {
  return {
    load(): Draft | null {
      if (!storage) return null
      try {
        const raw = storage.getItem(DRAFT_KEY)
        return raw ? sanitizeDraft(JSON.parse(raw)) : null
      } catch {
        return null
      }
    },
    save(d: Draft): void {
      if (!storage) return
      try {
        const clean = sanitizeDraft(d)
        if (clean) storage.setItem(DRAFT_KEY, JSON.stringify(clean))
      } catch {
        // storage full / blocked: the flow still works from memory
      }
    },
    clear(): void {
      try {
        storage?.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }
    },
  }
}

export function browserStorage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** Sign out, then drop the draft: nothing personal stays behind on a shared computer. */
export async function signOutAndClear(auth: { signOut(): Promise<unknown> }, store: { clear(): void }): Promise<void> {
  try {
    await auth.signOut()
  } finally {
    store.clear()
  }
}

/** Who the draft is for is not stored; this is the shape of an empty (nothing imported, nothing reviewed) draft. */
export const draftStatusOf = (d: Draft | null): 'none' | 'imported' | 'reviewed' => (d ? d.status : 'none')
