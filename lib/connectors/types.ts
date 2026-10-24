// Shared shapes for the import connectors. Every connector returns a ConnectorResult;
// merge.ts combines them into one ImportDraft. This is a superset of what /api/parse-cv
// has always returned (name…experience) — new fields are additive.

export interface ImportProject {
  title: string
  description: string
  stack: string[]
  url?: string
}

export interface ImportExperience {
  company: string
  role: string
  period: string
  bullets: string[]
}

export interface ImportEducation {
  degree: string
  institution: string
  year: string
  grade?: string
}

/**
 * A repo offered to the user by the GitHub connector. `selected` marks the best few; the review form lets
 * the user tick/untick. Only fields that the review UI displays are kept.
 */
export interface ProjectCandidate {
  id: string // owner/name — stable key and the value used by exclude lists
  title: string
  description: string
  ai_description?: true // description was written from the README by the optional summariser
  stack: string[]
  repo_url: string
  live_url?: string
  stars: number
  pushed_at: string // ISO date, shown as "updated …"
  selected: boolean
}

export interface ImportDraft {
  name: string | null
  role: string | null
  email: string | null
  location: string | null
  bio: string | null
  github_url: string | null
  linkedin_url: string | null
  skills: string[]
  certifications: string[]
  projects: ImportProject[]
  experience: ImportExperience[]
  education: ImportEducation[]
  /** Imported profile photo URL (GitHub avatar). Displayed in the form preview and on the portfolio. */
  avatar_url: string | null
  /** GitHub only: ranked repos for the picker (≤ 10, best few flagged `selected`). */
  project_candidates: ProjectCandidate[]
}

export type SourceName = 'document' | 'text' | 'github'

export interface Provenance {
  field: keyof ImportDraft
  source: SourceName
}

export interface ConnectorResult {
  source: SourceName
  profile: Partial<ImportDraft>
  provenance: Provenance[]
  warnings: string[]
}

export type ImportErrorCode =
  | 'no_file'
  | 'unsupported_type'
  | 'file_too_large'
  | 'too_many_pages'
  | 'no_text'
  | 'too_long'
  | 'parse_failed'
  | 'invalid_username'
  | 'not_found'
  | 'rate_limited'
  | 'no_public_repos'
  | 'upstream_unavailable'
  | 'pii_unavailable'
  | 'disabled'

export class ImportError extends Error {
  constructor(public code: ImportErrorCode, message: string) {
    super(message)
    this.name = 'ImportError'
  }

  /** HTTP status the API layer should use for this error. */
  get status(): number {
    switch (this.code) {
      case 'file_too_large': return 413
      case 'not_found': return 404
      case 'rate_limited': return 429
      case 'upstream_unavailable': return 502
      case 'pii_unavailable': return 503
      case 'disabled': return 404
      default: return 422
    }
  }
}

export const LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxPages: 6,
  maxTextChars: 12_000,
  minTextChars: 40,
  bio: 500,
  skills: 15,
  projects: 4,
  projectDescription: 200,
  bulletsPerRole: 4,
  bullet: 200,
  experience: 10,
  education: 3, // = /api/generate's cap (tests/import-limits.test.ts keeps them in sync)
  certifications: 20,
} as const
