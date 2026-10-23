import { NextRequest } from 'next/server'

// ⚠ NOT production-grade abuse protection.
// Everything here is in-process: it resets on restart/deploy and is not shared between instances.
// It is a last-resort backstop only. Real per-IP limits need either a Cloudflare rate-limiting
// rule on /api/import and /api/parse-cv, or a persistent store (see docs/import-connectors.md).

/**
 * Client IP, but only from a header the operator has explicitly declared trustworthy via
 * TRUSTED_IP_HEADER (e.g. "cf-connecting-ip" once the origin accepts Cloudflare traffic only).
 * With no declaration we do NOT guess: x-forwarded-for's first hop is client-controlled.
 * Returns 'unknown' → all such callers share one bucket (fails safe, not open).
 */
export function clientIp(req: NextRequest): string {
  const header = process.env.TRUSTED_IP_HEADER?.toLowerCase()
  if (!header) return 'unknown'
  const v = req.headers.get(header)?.split(',')[0]?.trim()
  return v || 'unknown'
}

interface Bucket { count: number; resetAt: number }
const MAX_KEYS = 5000
const hits = new Map<string, Bucket>()
let global: Bucket = { count: 0, resetAt: 0 }

const DAY = 24 * 60 * 60 * 1000

/** Best-effort per-key limiter. Returns true when the call is allowed. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = hits.get(key)
  if (!b || now > b.resetAt) {
    if (hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value as string)
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count++
  return true
}

/** Global daily cap on AI-backed import calls. IMPORT_DAILY_CALL_CAP unset/0 → no cap. */
export function withinDailyCap(): boolean {
  const cap = Number(process.env.IMPORT_DAILY_CALL_CAP || 0)
  if (!cap) return true
  const now = Date.now()
  if (now > global.resetAt) global = { count: 0, resetAt: now + DAY }
  if (global.count >= cap) return false
  global.count++
  return true
}

export const IMPORT_PER_IP_PER_DAY = 10
export const DAY_MS = DAY
