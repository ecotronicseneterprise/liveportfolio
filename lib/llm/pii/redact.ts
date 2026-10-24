import { LlmError, PiiEngine, PiiEntity, PiiSpan } from './types'
import { RegexEngine, detectKnownNames } from './regex-engine'

// Config comes from env at call time (never cached) so tests and ops changes take effect.
//   PII_ENGINE=regex                      only "regex" exists; anything else counts as an engine failure
//   PII_SCORE_THRESHOLDS="PHONE=0.7,..."  per-entity minimum score (default 0 = accept all)
//   PII_ON_ENGINE_FAILURE=block|regex_only   default block
//   PII_REDACT_PERSON=true                reserved for NER-capable engines; no effect on RegexEngine
//                                         (exact-match NAME redaction of caller-supplied names is always on)

const PRIORITY: Record<PiiEntity, number> = { ID: 0, CARD: 1, EMAIL: 2, URL: 3, PHONE: 4, NAME: 5 }
const TOKEN_RE = /\[(EMAIL|PHONE|URL|ID|CARD|NAME)_(\d+)\]/g

export function parseThresholds(raw = process.env.PII_SCORE_THRESHOLDS || ''): Partial<Record<PiiEntity, number>> {
  const out: Partial<Record<PiiEntity, number>> = {}
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=').map((s) => s.trim())
    const n = Number(v)
    if (k && k in PRIORITY && Number.isFinite(n)) out[k as PiiEntity] = n
  }
  return out
}

export function resolveEngine(): PiiEngine {
  const name = (process.env.PII_ENGINE || 'regex').toLowerCase()
  if (name === 'regex') return new RegexEngine()
  throw new Error(`unknown PII engine "${name}"`)
}

/** Deterministic overlap merge: higher-priority entity first, then longer span, then earlier start. */
export function mergeSpans(spans: PiiSpan[]): PiiSpan[] {
  const sorted = [...spans].sort(
    (a, b) =>
      PRIORITY[a.entity] - PRIORITY[b.entity] ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start ||
      b.score - a.score
  )
  const kept: PiiSpan[] = []
  for (const s of sorted) {
    if (s.end <= s.start) continue
    if (kept.some((k) => s.start < k.end && k.start < s.end)) continue
    kept.push(s)
  }
  return kept.sort((a, b) => a.start - b.start)
}

export interface Redaction {
  text: string
  /** token → original. Lives in request scope only; never log or persist it. */
  map: Map<string, string>
  counts: Partial<Record<PiiEntity, number>>
}

const norm = (entity: PiiEntity, v: string) =>
  entity === 'PHONE' || entity === 'ID' || entity === 'CARD' ? v.replace(/\D/g, '') : v.toLowerCase()

/**
 * Replace detected spans with [ENTITY_n] placeholders. Same value → same token.
 * Engine failure: PII_ON_ENGINE_FAILURE=block (default) throws LlmError 503;
 * regex_only falls back to RegexEngine. Raw text is never forwarded after a failure.
 */
export async function redact(
  input: string,
  opts: { names?: string[]; engine?: PiiEngine } = {}
): Promise<Redaction> {
  // A literal token-looking string in user text would be "restored" into something else. Defuse it.
  const text = input.replace(TOKEN_RE, '($1_$2)')

  let spans: PiiSpan[]
  try {
    const engine = opts.engine ?? resolveEngine()
    spans = await engine.detect(text)
  } catch {
    if ((process.env.PII_ON_ENGINE_FAILURE || 'block') === 'regex_only') {
      spans = new RegexEngine().detect(text)
    } else {
      throw new LlmError('pii_engine_unavailable', 'Privacy filter unavailable; nothing was sent to the AI provider.')
    }
  }

  if (opts.names?.length) spans = spans.concat(detectKnownNames(text, opts.names))

  const thresholds = parseThresholds()
  const kept = mergeSpans(spans.filter((s) => s.score >= (thresholds[s.entity] ?? 0)))

  const map = new Map<string, string>()
  const byValue = new Map<string, string>()
  const counters: Partial<Record<PiiEntity, number>> = {}
  const counts: Partial<Record<PiiEntity, number>> = {}

  let out = ''
  let cursor = 0
  for (const s of kept) {
    const original = text.slice(s.start, s.end)
    const key = `${s.entity}:${norm(s.entity, original)}`
    let token = byValue.get(key)
    if (!token) {
      counters[s.entity] = (counters[s.entity] ?? 0) + 1
      token = `[${s.entity}_${counters[s.entity]}]`
      byValue.set(key, token)
      map.set(token, original)
    }
    counts[s.entity] = (counts[s.entity] ?? 0) + 1
    out += text.slice(cursor, s.start) + token
    cursor = s.end
  }
  out += text.slice(cursor)
  return { text: out, map, counts }
}

/** Walk any JSON value and restore tokens in every string. Unknown tokens are removed and reported. */
export function restore<T>(value: T, map: Map<string, string>): { value: T; warnings: string[] } {
  let unknown = 0
  const fix = (s: string) =>
    s.replace(TOKEN_RE, (tok) => {
      const orig = map.get(tok)
      if (orig !== undefined) return orig
      unknown++
      return ''
    })
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return fix(v)
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]))
    }
    return v
  }
  const result = walk(value) as T // must run first: it counts the unknown tokens
  const warnings = unknown
    ? [`The AI returned ${unknown} placeholder(s) we could not match; they were removed. Please check the result.`]
    : []
  return { value: result, warnings }
}

export const TOKEN_INSTRUCTION =
  'Some personal details in the text were replaced with placeholders like [EMAIL_1], [PHONE_1], [URL_2], [ID_1], [NAME_1]. ' +
  'Copy a placeholder verbatim, exactly as written, wherever you would use that detail. ' +
  'Never invent, guess or complete contact details, and never alter a placeholder.'
