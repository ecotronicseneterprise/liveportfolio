// PROPOSAL (prototype, not wired into the app): pick the candidate's email instead of "first match".
//
// Current production behaviour (lib/connectors/document.ts): text.match(EMAIL)[0].
// Failure modes measured on the synthetic set: an attacker/"reference note" email placed before the
// name is taken (3 of 4 injection-early docs), and a referee's email could be taken if it came first.
//
// Approach: collect every email with its position and local context, score, return the best with
// provenance, plus the alternatives so the UI can ask the user when it is not clear-cut.
//  + near the top of the document / inside the contact block (same ~300-char window as a phone or a
//    LinkedIn/GitHub URL)
//  + repeated (page headers/footers repeat the candidate's contact line)
//  + the local part resembles the candidate's name (when a name is known)
//  − inside or after a "Referees / References" heading
//  − preceded by hand-off phrases ("contact HR at", "reference note", "reported to", "referee")
//  − within 200 chars of prompt-injection phrases ("ignore previous instructions", "system:")

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const REFEREE_HEAD = /\b(referees?|references?|référ?ences?|referees available)\b/i
const HANDOFF = /\b(contact (hr|us|the)|reference note|for the reader|reported to|supervisor|manager|referee|reference)\b/i
const INJECTION = /(ignore (all )?(previous|prior) instructions|system\s*:|disregard (the )?above|use this as the candidate)/i
const CONTACT_NEIGHBOUR = /(\+?\d[\d\s().-]{7,}|linkedin\.com|github\.com|tel|phone|mobile|tél)/i

export interface EmailCandidate { email: string; score: number; index: number; reasons: string[] }
export interface EmailChoice {
  email: string | null
  provenance: 'contact-block' | 'top-of-document' | 'repeated' | 'name-match' | 'only-candidate' | null
  ambiguous: boolean
  candidates: EmailCandidate[]
}

export function selectEmail(text: string, opts: { name?: string } = {}): EmailChoice {
  const found = [...text.matchAll(EMAIL)].map((m) => ({ email: m[0], index: m.index! }))
  if (!found.length) return { email: null, provenance: null, ambiguous: false, candidates: [] }

  const NL = String.fromCharCode(10)
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === NL) starts.push(i + 1)
  const lineOf = (idx: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1 } return lo }
  const refereeAt = (() => { const m = REFEREE_HEAD.exec(text.slice(Math.floor(text.length * 0.3))); return m ? Math.floor(text.length * 0.3) + m.index : Infinity })()
  const byEmail = new Map<string, EmailCandidate>()
  const nameParts = (opts.name ?? '').toLowerCase().split(/\s+/).filter((p) => p.length > 2)

  for (const f of found) {
    const key = f.email.toLowerCase()
    // context is LINE-bound: this line (text before the email) + the line above; injection phrases also
    // look one line below. Character windows were too wide: they let an injected note poison the real email.
    const L = lineOf(f.index)
    const lineStart = starts[L]
    const prevLine = L > 0 ? text.slice(starts[L - 1], starts[L]) : ''
    const nextLine = L + 1 < starts.length ? text.slice(starts[L + 1], starts[L + 2] ?? text.length) : ''
    const before = prevLine + text.slice(lineStart, f.index)
    const around = text.slice(Math.max(0, f.index - 200), f.index + f.email.length + 200)
    const eol = text.indexOf(NL, f.index)
    const injectionCtx = prevLine + text.slice(lineStart, eol < 0 ? text.length : eol) + nextLine
    const reasons: string[] = []
    let s = 0
    if (f.index < Math.min(700, text.length * 0.2)) { s += 2; reasons.push('top') }
    if (CONTACT_NEIGHBOUR.test(around.replace(f.email, ' '))) { s += 2; reasons.push('contact-block') }
    if (nameParts.some((p) => key.split('@')[0].includes(p))) { s += 2; reasons.push('name-match') }
    if (f.index > refereeAt) { s -= 6; reasons.push('after-referee-heading') }
    if (HANDOFF.test(before)) { s -= 4; reasons.push('hand-off-phrase') }
    if (INJECTION.test(injectionCtx)) { s -= 8; reasons.push('injection-phrase') }
    const prev = byEmail.get(key)
    if (prev) { prev.score += 1 + s * 0; prev.reasons.push('repeated'); continue }
    byEmail.set(key, { email: f.email, score: s, index: f.index, reasons })
  }

  const cands = [...byEmail.values()].sort((a, b) => b.score - a.score || a.index - b.index)
  const best = cands[0]
  const second = cands[1]
  const ambiguous = !!second && best.score - second.score < 2
  const provenance: EmailChoice['provenance'] =
    cands.length === 1 ? 'only-candidate'
    : best.reasons.includes('name-match') ? 'name-match'
    : best.reasons.includes('contact-block') ? 'contact-block'
    : best.reasons.includes('repeated') ? 'repeated'
    : 'top-of-document'
  // a clearly penalised sole survivor is not trustworthy either
  if (best.score < 0) return { email: null, provenance: null, ambiguous: true, candidates: cands }
  return { email: best.email, provenance, ambiguous, candidates: cands }
}
