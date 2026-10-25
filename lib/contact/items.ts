// The contact details of a portfolio, as a list of safe, ready-to-draw items. One function for every template (free, Pro, original and
// redesigned), so a portfolio shows the same contacts everywhere: e-mail, phone, WhatsApp, and the social networks the person filled in.
// Nothing is invented: an empty or invalid field produces no item. Links must be plain http(s) addresses; a phone number becomes a tel: link
// only if it looks like a phone number. Pure, no React.
import { httpUrl } from '@/lib/connectors/safe-url'

export type ContactKind = 'email' | 'phone' | 'whatsapp' | 'linkedin' | 'github' | 'website' | 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok'

export interface ContactItem {
  kind: ContactKind
  /** "Email", "LinkedIn": the accessible name. */
  label: string
  href: string
  /** What is shown beside the icon on a wide screen. */
  text: string
  /** Opens in a new tab (everything except mail and phone). */
  external: boolean
}

const LABEL: Record<ContactKind, string> = {
  email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', github: 'GitHub', website: 'Website',
  x: 'X', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok',
}

/** The content fields that hold a social or web link, in the order they are shown. */
export const SOCIAL_FIELDS: ReadonlyArray<readonly [string, ContactKind]> = [
  ['linkedin_url', 'linkedin'], ['github_url', 'github'], ['website_url', 'website'], ['twitter_url', 'x'],
  ['instagram_url', 'instagram'], ['facebook_url', 'facebook'], ['youtube_url', 'youtube'], ['tiktok_url', 'tiktok'],
]
export const SOCIAL_URL_FIELDS = SOCIAL_FIELDS.map(([f]) => f)

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** "https://www.linkedin.com/in/ada/" becomes "linkedin.com/in/ada". */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.hostname.replace(/^www\./, '')}${path}`.slice(0, 60)
  } catch {
    return url.slice(0, 60)
  }
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/

export function contactItems(content: Record<string, unknown> | null | undefined): ContactItem[] {
  const c = content ?? {}
  const out: ContactItem[] = []

  const email = str(c.email, 254)
  if (email && EMAIL_RE.test(email)) out.push({ kind: 'email', label: LABEL.email, href: `mailto:${email}`, text: email, external: false })

  const phone = str(c.phone, 30)
  if (phone && /^[+0-9()\s.-]{5,30}$/.test(phone)) {
    const digits = phone.replace(/[^0-9+]/g, '')
    const norm = digits.startsWith('+') ? '+' + digits.slice(1).replace(/\+/g, '') : digits.replace(/\+/g, '')
    if (norm.replace(/\D/g, '').length >= 5) out.push({ kind: 'phone', label: LABEL.phone, href: `tel:${norm}`, text: phone, external: false })
  }

  const wa = str(c.whatsapp, 30).replace(/[^0-9]/g, '')
  if (wa.length >= 7 && wa.length <= 15) out.push({ kind: 'whatsapp', label: LABEL.whatsapp, href: `https://wa.me/${wa}`, text: `+${wa}`, external: true })

  for (const [field, kind] of SOCIAL_FIELDS) {
    const raw = str(c[field], 300)
    if (!raw) continue
    const url = httpUrl(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`, 300)
    if (url) out.push({ kind, label: LABEL[kind], href: url, text: shortUrl(url), external: true })
  }
  return out
}
