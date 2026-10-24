import { ConnectorResult, ImportDraft, ImportProject, LIMITS, Provenance, SourceName } from './types'
import { dedupeStrings, emptyDraft, normalizeProfile } from './normalize'

// Precedence per field, highest first. The user reviews the merged draft, so this only
// decides which value is pre-filled; disagreements are surfaced as warnings.
//  - Career history (experience/education/certs) and identity come from the CV/text.
//  - Projects: CV/text projects are user-written, so they take the slots first;
//    GitHub fills whatever is left up to the cap.
const PRECEDENCE: Record<SourceName, number> = { document: 0, text: 1, github: 2 }

const SCALARS = ['name', 'role', 'email', 'location', 'bio', 'github_url', 'linkedin_url', 'avatar_url'] as const

export function mergeResults(results: ConnectorResult[]): {
  draft: ImportDraft
  provenance: Provenance[]
  warnings: string[]
} {
  const ordered = [...results].sort((a, b) => PRECEDENCE[a.source] - PRECEDENCE[b.source])
  const draft = emptyDraft()
  const provenance: Provenance[] = []
  const warnings = ordered.flatMap((r) => r.warnings)

  const norm = ordered.map((r) => ({ source: r.source, profile: normalizeProfile(r.profile) }))

  for (const field of SCALARS) {
    for (const { source, profile } of norm) {
      const v = profile[field]
      if (typeof v !== 'string' || !v) continue
      if (draft[field] === null) {
        draft[field] = v
        provenance.push({ field, source })
      } else if (
        (field === 'name' || field === 'location' || field === 'role') &&
        draft[field]!.toLowerCase() !== v.toLowerCase()
      ) {
        warnings.push(`${field} differs between sources ("${draft[field]}" vs "${v}"); kept the first.`)
      }
    }
  }

  const take = <K extends 'experience' | 'education'>(field: K) => {
    for (const { source, profile } of norm) {
      const v = profile[field]
      if (v && v.length > 0) {
        ;(draft[field] as unknown) = v
        provenance.push({ field, source })
        return
      }
    }
  }
  take('experience')
  take('education')

  const unionStrings = (field: 'skills' | 'certifications', max: number) => {
    const all: string[] = []
    for (const { source, profile } of norm) {
      const v = profile[field]
      if (v && v.length) {
        all.push(...v)
        provenance.push({ field, source })
      }
    }
    draft[field] = dedupeStrings(all, max)
  }
  unionStrings('skills', LIMITS.skills)
  unionStrings('certifications', LIMITS.certifications)

  const projects: ImportProject[] = []
  const seen = new Set<string>()
  for (const { source, profile } of norm) {
    const list = profile.projects
    if (!list || list.length === 0) continue
    let used = false
    for (const p of list) {
      const key = (p.url || p.title).toLowerCase()
      const titleKey = p.title.toLowerCase()
      if (seen.has(key) || seen.has(titleKey)) continue
      if (projects.length >= LIMITS.projects) break
      seen.add(key)
      seen.add(titleKey)
      projects.push(p)
      used = true
    }
    if (used) provenance.push({ field: 'projects', source })
  }
  draft.projects = projects

  // GitHub's ranked candidates (for the picker) pass through untouched; only that connector produces them
  const withCandidates = norm.find((n) => n.profile.project_candidates?.length)
  if (withCandidates) {
    draft.project_candidates = withCandidates.profile.project_candidates!
    provenance.push({ field: 'project_candidates', source: withCandidates.source })
  }

  return { draft, provenance, warnings }
}
