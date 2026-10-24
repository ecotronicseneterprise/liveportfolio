// Slug rules shared by /api/check-slug (live availability hint) and /api/account/profile (the authoritative check
// at signup). Keep them in one place: the signup route must never accept something the hint rejected.

/** 3–30 chars, lowercase letters/digits/hyphens, no leading or trailing hyphen (a DNS label cannot start/end with one). */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/

// Union of: the original check-slug list, every single-segment path that middleware.ts treats as an app route
// (otherwise `liveportfolio.site/<slug>` would not reach the portfolio), and names reserved for upcoming features.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // original check-slug list
  'api', 'www', 'app', 'admin', 'blog', 'help', 'dashboard', 'status',
  'support', 'login', 'signup', 'register', 'pricing', 'about', 'contact',
  'terms', 'privacy', 'docs', 'faq', 'team', 'careers', 'demo', 'test',
  'null', 'undefined', 'liveportfolio', 'invite', 'bootcamp', 'what-is-a-portfolio',
  'cv-to-portfolio', 'portfolio-builder', 'free-portfolio-website',
  // app routes in middleware.ts
  'auth', 'create', 'portfolio', 'preview', 'reset-password', 'test-templates',
  // infrastructure / planned
  'mail', 'smtp', 'ftp', 'ns1', 'ns2', 'cdn', 'static', 'assets', 'mcp', 'oauth', 'well-known',
])

export type SlugCheck = { ok: true; slug: string } | { ok: false; error: 'invalid_slug' | 'reserved_slug'; message: string }

export function normalizeSlug(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

/** Format and reserved-word check only (uniqueness needs the database). */
export function checkSlugShape(raw: unknown): SlugCheck {
  const slug = normalizeSlug(raw)
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: 'invalid_slug',
      message: 'Slug must be 3-30 characters: lowercase letters, numbers and hyphens, not starting or ending with a hyphen.',
    }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: 'reserved_slug', message: 'That address is reserved. Please choose another one.' }
  }
  return { ok: true, slug }
}
