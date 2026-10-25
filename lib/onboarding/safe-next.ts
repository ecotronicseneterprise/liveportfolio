// Same-origin redirect target from a query string (?next=/create). Only a short allow-list of in-app path prefixes is
// accepted; anything else (absolute URLs, //host, backslashes, control characters, encoded tricks) falls back.

const ALLOWED_PREFIXES = ['/create', '/dashboard', '/preview', '/reset-password', '/admin']
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\\u0000- \u007f]/

export function safeNext(value: unknown, fallback = '/create'): string {
  if (typeof value !== 'string' || value.length > 300) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (UNSAFE.test(value)) return fallback
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(value.split(/[?#]/, 1)[0] ?? '')
  } catch {
    return fallback
  }
  if (decodedPath.startsWith('//') || UNSAFE.test(decodedPath) || decodedPath.includes('..')) return fallback
  try {
    const u = new URL(value, 'https://next.invalid')
    if (u.origin !== 'https://next.invalid') return fallback
  } catch {
    return fallback
  }
  const path = value.split(/[?#]/, 1)[0]
  const ok = ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
  return ok ? value : fallback
}
