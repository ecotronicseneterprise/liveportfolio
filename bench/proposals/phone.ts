// PROPOSAL (prototype): phone detection candidates, evaluated in bench/proposals-eval.ts.
//   current   RegexEngine PHONE (lib/llm/pii/regex-engine.ts)
//   proposed  adds "(0803) 555-0142" and "+234 (0) 803 555 0142" style Nigerian formats
//   libphone  libphonenumber-js findPhoneNumbersInText (port of Google's PhoneNumberMatcher)
import { findPhoneNumbersInText } from 'libphonenumber-js'
import { RegexEngine } from '../../lib/llm/pii/regex-engine'

export interface Hit { start: number; end: number }

export function currentPhones(text: string): Hit[] {
  return new RegexEngine().detect(text).filter((s) => s.entity === 'PHONE').map((s) => ({ start: s.start, end: s.end }))
}

// Nigerian mobile: optional (), optional "(0)" after +234, any of space . - between groups.
const SEP = '[\\s.-]?'
const NG_NATIONAL = new RegExp(`(?<![\\d+])\\(?0[789][01]\\d\\)?${SEP}\\d{3}${SEP}\\d{4}(?!\\d)`, 'g')
const NG_INTL = new RegExp(`(?<![\\d+])\\+?234${SEP}(?:\\(0\\)${SEP})?[789][01]\\d${SEP}\\d{3}${SEP}\\d{4}(?!\\d)`, 'g')

export function proposedPhones(text: string): Hit[] {
  const hits = currentPhones(text)
  for (const re of [NG_NATIONAL, NG_INTL]) for (const m of text.matchAll(re)) hits.push({ start: m.index!, end: m.index! + m[0].length })
  // merge overlaps, keep the widest
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Hit[] = []
  for (const h of hits) {
    const last = out[out.length - 1]
    if (last && h.start < last.end) last.end = Math.max(last.end, h.end)
    else out.push({ ...h })
  }
  return out
}

export function libPhones(text: string, country: 'NG' | 'US' | 'GB' = 'NG'): Hit[] {
  return findPhoneNumbersInText(text, country).map((m) => ({ start: m.startsAt, end: m.endsAt }))
}
