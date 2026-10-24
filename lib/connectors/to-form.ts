// Adapter: ImportDraft → the /create form state. Pure and client-safe (no server imports).
//
// Contract preserved from the original handleCvUpload in app/create/page.tsx:
//  - a field is only overwritten when the draft has a non-empty value;
//  - bio ≤ 500, github/linkedin ≤ 200, projects ≤ 4;
//  - project.stack is a comma-joined string, experience.bullets a newline-joined string;
//  - project image fields stay empty.
// Additions (previously dropped): skills → directSkills (merged, deduped, ≤ 15),
// certifications, education, project url.

import { isGithubAvatarUrl } from './safe-url'
import type { ImportDraft, ProjectCandidate } from './types'

export interface FormProject {
  title: string
  description: string
  stack: string
  url: string
  imageFile: File | null
  image_preview: string
}
export interface FormExperience { company: string; role: string; period: string; bullets: string }
export interface FormEducation { degree: string; institution: string; year: string; grade: string }

export interface FormSlice {
  avatar_url: string
  name: string
  role: string
  email: string
  location: string
  bio: string
  github_url: string
  linkedin_url: string
  directSkills: string[]
  certifications: string[]
  projects: FormProject[]
  experience: FormExperience[]
  education: FormEducation[]
}

function mergeUnique(existing: string[], incoming: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of [...existing, ...incoming]) {
    const k = s.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(s.trim())
    if (out.length >= max) break
  }
  return out
}

export function applyDraftToForm<T extends FormSlice>(prev: T, d: Partial<ImportDraft>): T {
  const next: T = { ...prev }

  if (d.name) next.name = d.name
  if (d.role) next.role = d.role
  if (d.email) next.email = d.email
  if (d.location) next.location = d.location
  if (d.bio) next.bio = d.bio.slice(0, 500)
  if (d.github_url) next.github_url = d.github_url.slice(0, 200)
  if (d.linkedin_url) next.linkedin_url = d.linkedin_url.slice(0, 200)

  // remote avatars are only taken from GitHub's CDN and never replace a photo the user already chose
  if (d.avatar_url && !prev.avatar_url && isGithubAvatarUrl(d.avatar_url)) next.avatar_url = d.avatar_url

  if (d.skills?.length) next.directSkills = mergeUnique(prev.directSkills, d.skills, 15)
  if (d.certifications?.length) next.certifications = mergeUnique(prev.certifications, d.certifications, 20)

  if (d.projects?.length) {
    next.projects = d.projects.slice(0, 4).map((p) => ({
      title: p.title || '',
      description: p.description || '',
      stack: (p.stack || []).join(', '),
      url: p.url || '',
      imageFile: null,
      image_preview: '',
    }))
  }
  if (d.experience?.length) {
    next.experience = d.experience.map((e) => ({
      company: e.company || '',
      role: e.role || '',
      period: e.period || '',
      bullets: (e.bullets || []).join('\n'),
    }))
  }
  if (d.education?.length) {
    next.education = d.education.map((e) => ({
      degree: e.degree || '',
      institution: e.institution || '',
      year: e.year || '',
      grade: e.grade || '',
    }))
  }
  return next
}

/** Project candidates → form project rows (the form and /api/generate hold at most MAX_FORM_PROJECTS). */
export const MAX_FORM_PROJECTS = 4

export function candidateToFormProject(c: ProjectCandidate): FormProject {
  return {
    title: c.title,
    description: c.description,
    stack: c.stack.join(', '),
    url: c.live_url ?? c.repo_url,
    imageFile: null,
    image_preview: '',
  }
}

/**
 * Picker → form rows. Ticked candidates become rows (an existing row with the same title is kept as-is so the
 * user's edits and images survive re-ticking); manual rows that match no candidate are preserved after them.
 * At most MAX_FORM_PROJECTS rows; never returns an empty list (the form needs one blank row).
 */
export function reconcileProjects<T extends FormSlice>(prev: T, candidates: ProjectCandidate[], pickedIds: string[]): T {
  const picked = new Set(pickedIds)
  const known = new Set(candidates.map((c) => c.title.trim().toLowerCase()))
  const existing = (title: string) => prev.projects.find((p) => p.title.trim().toLowerCase() === title.trim().toLowerCase())
  const fromCandidates = candidates.filter((c) => picked.has(c.id)).map((c) => existing(c.title) ?? candidateToFormProject(c))
  const manual = prev.projects.filter((p) => p.title.trim() && !known.has(p.title.trim().toLowerCase()))
  const rows = [...fromCandidates, ...manual].slice(0, MAX_FORM_PROJECTS)
  return { ...prev, projects: rows.length ? rows : [{ title: '', description: '', stack: '', url: '', imageFile: null, image_preview: '' }] }
}
