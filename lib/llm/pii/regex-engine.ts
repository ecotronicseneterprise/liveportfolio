import { PiiEngine, PiiEntity, PiiSpan } from './types'

// Deterministic, dependency-free detector. It finds DIRECT CONTACT IDENTIFIERS only:
// email, phone, URLs/handles, ID numbers (with context words) and card numbers.
// It deliberately does not attempt names, employers, locations or dates.
//
// Not a guarantee: a phone written as words, a URL split across lines, or a bare personal domain
// outside the TLD list below will pass through. See docs/pii-gateway.md.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g

// Scheme/www URLs, linkedin/github paths without a scheme, and bare domains on a short TLD list.
// `.io`, `.js`, `.ai`, `.co`, `.net` are intentionally absent so "Socket.io", "Next.js", "ASP.NET" survive.
const URL_FULL = /\bhttps?:\/\/[^\s<>"')\]]+/gi
const URL_WWW = /\bwww\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+[^\s<>"')\]]*/gi
const URL_SOCIAL = /\b(?:[a-z]{2,3}\.)?(?:linkedin\.com\/(?:in|pub|company)|github\.com|gitlab\.com|twitter\.com|x\.com|behance\.net|dribbble\.com|medium\.com|kaggle\.com)\/[A-Za-z0-9_\-%.]+(?:\/[^\s<>"')\]]*)?/gi
const URL_BARE = /(?<![@\w.-])[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.(?:com|org|dev|me|app|site|xyz|ng|tech|online|work)(?:\/[^\s<>"')\]]*)?(?![\w@-])/gi
const HANDLE = /(?<![\w@.])@[A-Za-z0-9_]{3,30}\b(?!\.[A-Za-z])/g

// Nigerian mobile: +234 / 234 / 0 then 7|8|9 then 0|1, 8 more digits; spaces or dashes allowed.
const PHONE_NG = /(?<![\d+])(?:\+?234[\s-]?|0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g
// International with a leading +, and US-style (xxx) xxx-xxxx.
const PHONE_INTL = /(?<![\d+])\+\s?\(?\d{1,4}\)?(?:[\s.-]?\(?\d{2,4}\)?){2,5}(?!\d)/g
const PHONE_US = /(?<!\d)\(\d{3}\)\s?\d{3}[\s.-]\d{4}(?!\d)/g

// 11-digit NIN/BVN style numbers are only flagged near a context word — a bare 11-digit
// number could be a phone number or a reference number.
const ID_CONTEXT = /\b(?:nin|bvn|national\s+id(?:entity)?(?:\s+number)?|nimc|tax\s+id|tin|passport(?:\s+(?:no|number))?|ssn|id\s+(?:no|number))\b[^\d\n]{0,25}(\d[\d\s-]{6,18}\d)/gi

const CARD = /(?<![\d-])(?:\d[ -]?){13,19}(?![\d-])/g

function luhn(digits: string): boolean {
  let sum = 0
  let dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

function digitCount(s: string): number {
  return s.replace(/\D/g, '').length
}

function push(out: PiiSpan[], entity: PiiEntity, m: RegExpMatchArray | RegExpExecArray, score: number, group = 0) {
  const text = m[group]
  if (!text || m.index === undefined) return
  const start = group === 0 ? m.index : m.index + m[0].indexOf(text)
  out.push({ entity, start, end: start + text.length, score })
}

/** Trailing sentence punctuation is not part of a URL. */
function trimTrailing(out: PiiSpan[], from: number, text: string) {
  for (let i = from; i < out.length; i++) {
    while (out[i].end > out[i].start && /[.,;:!?]/.test(text[out[i].end - 1])) out[i].end--
  }
}

export class RegexEngine implements PiiEngine {
  readonly name = 'regex'

  detect(text: string): PiiSpan[] {
    const out: PiiSpan[] = []

    for (const m of text.matchAll(EMAIL)) push(out, 'EMAIL', m, 0.95)

    const urlStart = out.length
    for (const m of text.matchAll(URL_FULL)) push(out, 'URL', m, 0.95)
    for (const m of text.matchAll(URL_WWW)) push(out, 'URL', m, 0.9)
    for (const m of text.matchAll(URL_SOCIAL)) push(out, 'URL', m, 0.9)
    for (const m of text.matchAll(URL_BARE)) push(out, 'URL', m, 0.6)
    for (const m of text.matchAll(HANDLE)) push(out, 'URL', m, 0.6)
    trimTrailing(out, urlStart, text)

    for (const m of text.matchAll(PHONE_NG)) push(out, 'PHONE', m, /^\+?234/.test(m[0]) ? 0.9 : 0.7)
    for (const m of text.matchAll(PHONE_INTL)) {
      const n = digitCount(m[0])
      if (n >= 9 && n <= 15) push(out, 'PHONE', m, 0.8)
    }
    for (const m of text.matchAll(PHONE_US)) push(out, 'PHONE', m, 0.8)

    for (const m of text.matchAll(ID_CONTEXT)) {
      const n = digitCount(m[1])
      if (n >= 8 && n <= 16) push(out, 'ID', m, 0.85, 1)
    }

    for (const m of text.matchAll(CARD)) {
      const digits = m[0].replace(/\D/g, '')
      if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
        // trim the trailing separator the greedy pattern may have consumed
        const trimmed = m[0].replace(/[ -]+$/, '')
        out.push({ entity: 'CARD', start: m.index!, end: m.index! + trimmed.length, score: 0.9 })
      }
    }
    return out
  }
}

/** Exact-match name spans (case-insensitive, whole-word), for names the caller already knows. */
export function detectKnownNames(text: string, names: string[]): PiiSpan[] {
  const out: PiiSpan[] = []
  const variants = new Set<string>()
  for (const raw of names) {
    const n = raw.replace(/\s+/g, ' ').trim()
    if (n.length < 4) continue
    variants.add(n)
    const parts = n.split(' ')
    if (parts.length === 2) variants.add(`${parts[1]} ${parts[0]}`)
  }
  for (const v of variants) {
    const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'giu')
    for (const m of text.matchAll(re)) {
      out.push({ entity: 'NAME', start: m.index!, end: m.index! + m[0].length, score: 1 })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}
