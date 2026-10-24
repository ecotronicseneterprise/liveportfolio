// Affiliate (?ref=), invite (?invite=&free=true) and bootcamp (?bootcamp=&name=) links used to be captured by the OLD
// wizard. The account-first flow takes over, so the same keys and expiries are captured here (first touch wins for
// referral and bootcamp), then applied once the users row exists:
//   referral  → sent to POST /api/account/profile as referral_code (the server accepts only known partner keys)
//   invite    → POST /api/admin/invite/consume
//   bootcamp  → POST /api/bootcamp/redeem
// Everything is validated before it is stored, because it comes straight from a URL.

import type { KeyValueStore } from './draft'

export const KEYS = { referral: 'lp_referral', invite: 'lp_invite', bootcamp: 'lp_bootcamp' } as const
const DAY = 24 * 60 * 60 * 1000
const CODE_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/

const readJson = (storage: KeyValueStore | null, key: string): Record<string, unknown> | null => {
  try {
    const raw = storage?.getItem(key)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}
const live = (v: Record<string, unknown> | null, now: number) => !!v && typeof v.expires === 'number' && v.expires > now

const cleanName = (raw: string | null): string => {
  if (!raw) return ''
  let s = raw
  try { s = decodeURIComponent(raw) } catch { /* keep as is */ }
  return s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function captureAttribution(search: string, storage: KeyValueStore | null, now = Date.now()): void {
  if (!storage) return
  try {
    const q = new URLSearchParams(search)

    const ref = (q.get('ref') ?? '').trim().toLowerCase()
    if (CODE_RE.test(ref) && !live(readJson(storage, KEYS.referral), now)) {
      storage.setItem(KEYS.referral, JSON.stringify({ partner: ref, expires: now + 90 * DAY }))
    }

    const invite = (q.get('invite') ?? '').trim()
    if (TOKEN_RE.test(invite)) {
      storage.setItem(KEYS.invite, JSON.stringify({ token: invite, free_pro: q.get('free') === 'true', expires: now + DAY }))
    }

    const code = (q.get('bootcamp') ?? '').trim().toLowerCase()
    if (CODE_RE.test(code) && !live(readJson(storage, KEYS.bootcamp), now)) {
      storage.setItem(KEYS.bootcamp, JSON.stringify({ code, name: cleanName(q.get('name')) || code, expires: now + 90 * DAY }))
    }
  } catch {
    // storage blocked: the flow still works, just without attribution
  }
}

export interface Attribution {
  referral: string | null
  invite: { token: string; freePro: boolean } | null
  bootcamp: { code: string; name: string } | null
}

export function readAttribution(storage: KeyValueStore | null, now = Date.now()): Attribution {
  const r = readJson(storage, KEYS.referral)
  const i = readJson(storage, KEYS.invite)
  const b = readJson(storage, KEYS.bootcamp)
  return {
    referral: live(r, now) && typeof r!.partner === 'string' && CODE_RE.test(r!.partner) ? (r!.partner as string) : null,
    invite: live(i, now) && typeof i!.token === 'string' && TOKEN_RE.test(i!.token) ? { token: i!.token as string, freePro: i!.free_pro === true } : null,
    bootcamp: live(b, now) && typeof b!.code === 'string' && CODE_RE.test(b!.code) ? { code: b!.code as string, name: typeof b!.name === 'string' ? (b!.name as string) : (b!.code as string) } : null,
  }
}

export const INVITED_FLAG = 'lp_invited_upgraded'

/**
 * Called once, right after the users row was created. Never throws and never blocks the flow: a failed invite or bootcamp
 * call must not stop someone from getting their portfolio (it is logged server-side and can be redone by support).
 */
export async function applyAfterProfile(
  fetchImpl: typeof fetch,
  token: string,
  userId: string | null,
  storage: KeyValueStore | null,
  session?: { setItem(k: string, v: string): void } | null,
  now = Date.now(),
): Promise<{ inviteUpgraded: boolean }> {
  const a = readAttribution(storage, now)
  let inviteUpgraded = false
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  try {
    if (a.invite && userId) {
      const res = await fetchImpl('/api/admin/invite/consume', { method: 'POST', headers, body: JSON.stringify({ token: a.invite.token, user_id: userId }) })
      const j = await res.json().catch(() => ({}))
      inviteUpgraded = !!j.upgraded
    }
  } catch { /* see above */ }
  try { storage?.removeItem(KEYS.invite) } catch { /* ignore */ }
  try {
    if (a.bootcamp) {
      await fetchImpl('/api/bootcamp/redeem', { method: 'POST', headers, body: JSON.stringify({ code: a.bootcamp.code }) })
      storage?.removeItem(KEYS.bootcamp)
    }
  } catch { /* see above */ }
  try { storage?.removeItem(KEYS.referral) } catch { /* attribution now lives in the database */ }
  if (inviteUpgraded) { try { session?.setItem(INVITED_FLAG, '1') } catch { /* ignore */ } }
  return { inviteUpgraded }
}
