// Strict validators for values that come back from the import flow and end up in an <img src>, an <a href> or a
// request path. Everything here parses with `new URL` and compares the HOST EXACTLY — never `startsWith`/`includes`
// on the raw string, which "https://avatars.githubusercontent.com.evil.example/" or "...@evil.example" would defeat.

const AVATAR_HOST = 'avatars.githubusercontent.com'

/** https only, host exactly avatars.githubusercontent.com, default port, no credentials. */
export function isGithubAvatarUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 500) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && u.hostname === AVATAR_HOST && u.port === '' && !u.username && !u.password
  } catch {
    return false
  }
}

/** http(s) only; javascript:, data:, file:, vbscript: and bare text are rejected. Returns the normalised URL or null. */
export function httpUrl(v: unknown, max = 200): string | null {
  if (typeof v !== 'string') return null
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (u.username || u.password) return null
    const out = u.toString()
    return out.length <= max ? out : null
  } catch {
    return null
  }
}

/** A linkedin.com/in/<slug> profile: https host is linkedin.com or a subdomain of it (exact suffix match). */
export function isLinkedinProfileUrl(v: unknown): v is string {
  const s = httpUrl(v)
  if (!s) return false
  const u = new URL(s)
  const h = u.hostname.toLowerCase()
  return (h === 'linkedin.com' || h.endsWith('.linkedin.com')) && /^\/in\/[^/]+/i.test(u.pathname)
}

// GitHub logins: 1-39 letters/digits/single hyphens, no leading or trailing hyphen. The ONE definition: the connector, the
// import form and the social sign-in prefill all use it.
export const GITHUB_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
export const isGithubLogin = (v: unknown): v is string => typeof v === 'string' && GITHUB_LOGIN_RE.test(v)

/**
 * The GitHub username from whatever was typed or pasted: "octocat", "@octocat", "github.com/octocat",
 * "https://github.com/octocat/repo?tab=x". Anything that is not a valid login (including look-alike hosts such as
 * github.com.evil.example) returns null. The ONE parser: the form, the API and the connector all use it.
 */
export function normalizeGithubInput(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim().replace(/^@/, '')
  if (!s || s.length > 300) return null
  const fromUrl = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  const name = fromUrl ? fromUrl[1] : s
  return isGithubLogin(name) ? name : null
}

// GitHub repo names: letters, digits, '.', '_', '-' (max 100). An entry may be "owner/name".
const REPO_PART = /^[A-Za-z0-9._-]{1,100}$/
export function isRepoRef(s: string): boolean {
  const parts = s.split('/')
  if (parts.length > 2) return false
  return parts.every((p) => REPO_PART.test(p) && p !== '.' && p !== '..')
}

export const MAX_EXCLUDE_RAW = 8_000
export const MAX_EXCLUDE_ITEMS = 50

/** Parses the `github_exclude` field: comma/newline separated repo names. Invalid entries are dropped, never trusted. */
export function parseExcludeList(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length > MAX_EXCLUDE_RAW) return []
  const seen = new Set<string>()
  for (const part of raw.split(/[,\n]/)) {
    const s = part.trim()
    if (s && isRepoRef(s)) seen.add(s)
    if (seen.size >= MAX_EXCLUDE_ITEMS) break
  }
  return [...seen]
}

/**
 * A project image URL as /api/upload-project-image returns it: the configured Supabase scheme (https in production), host EXACTLY this project's Supabase host, path inside
 * the public `project-images` bucket, no credentials. Anything else (another host, a look-alike, http, data:, javascript:) is
 * rejected, so a stored draft can never make a page load an image from somewhere else. Returns the URL or ''.
 */
export function projectImageUrl(
  v: unknown,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
  bucket: 'project-images' | 'avatars' = 'project-images',
): string {
  if (typeof v !== 'string' || v.length > 500 || !supabaseUrl) return ''
  try {
    const u = new URL(v)
    const base = new URL(supabaseUrl)
    // same scheme as the configured Supabase URL: https in production (an http image is rejected there), http only when a
    // developer points the app at a local Supabase
    if (u.protocol !== base.protocol || (base.protocol !== 'https:' && base.protocol !== 'http:') || u.host !== base.host || u.username || u.password) return ''
    if (!u.pathname.startsWith(`/storage/v1/object/public/${bucket}/`)) return ''
    return u.toString()
  } catch {
    return ''
  }
}

/**
 * An interactive Power BI report ("Publish to web"). The ONLY embed we accept. Takes the plain link or the whole embed code
 * (<iframe src="...">) and returns the clean https://app.powerbi.com/view?r=... address, or '' for anything else: another host,
 * another path, http, credentials, a different port, or an address without the report token. Host and path are compared EXACTLY.
 */
export function powerBiEmbedUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let v = raw.trim()
  if (!v || v.length > 2500) return ''
  const fromIframe = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(v)
  if (fromIframe) v = fromIframe[1].trim()
  v = v.replace(/&amp;/g, '&')
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:' || u.hostname !== 'app.powerbi.com' || u.port !== '' || u.username || u.password) return ''
    if (u.pathname !== '/view') return ''
    const r = u.searchParams.get('r')
    if (!r || r.length < 20 || r.length > 2000 || !/^[A-Za-z0-9_=.%-]+$/.test(r)) return ''
    // r and pageName were just checked against strict character sets, so building the string by hand is safe and keeps the token exactly as given
    const pg = u.searchParams.get('pageName')
    return `https://app.powerbi.com/view?r=${r}${pg && /^[A-Za-z0-9_-]{1,60}$/.test(pg) ? `&pageName=${pg}` : ''}`
  } catch {
    return ''
  }
}
