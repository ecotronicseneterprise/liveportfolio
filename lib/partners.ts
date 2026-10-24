// Affiliate partners — the single source of truth. Add a new partner HERE only.
// Used by: /api/cron/affiliate (weekly reports), /api/admin/invite (which partner an invite belongs to) and
// /api/account/profile (which referral codes from the browser are accepted at signup).

export interface Partner {
  name: string
  email: string
  commission: number // decimal, e.g. 0.30 = 30%
}

export const PARTNERS: Record<string, Partner> = {
  'esther': {
    name: 'Esther Anagu',
    email: 'anaguesther2@gmail.com',
    commission: 0.30,
  },
  'clifford': {
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    commission: 0,
  },
  'pelumi': {
    name: 'Pelumi',
    email: 'adekunmipelumi@yahoo.com',
    commission: 0.30,
  },
  'temitope': {
    name: 'Temitope',
    email: '',
    commission: 0.30,
  },
}

export const PARTNER_KEYS: readonly string[] = Object.keys(PARTNERS)

/** A referral code from the browser is only trusted if it is exactly a known partner key. */
export function normalizeReferral(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const key = code.trim().toLowerCase().slice(0, 40)
  return Object.prototype.hasOwnProperty.call(PARTNERS, key) ? key : null
}
