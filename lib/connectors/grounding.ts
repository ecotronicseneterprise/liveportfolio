// Grounding filters: model output is kept only if the source text supports it.

/** Does `needle` literally occur in `haystack` (case-insensitive, ignoring scheme/www/trailing slash)? */
export function appearsIn(haystack: string, needle: string): boolean {
  const clean = (s: string) =>
    s.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
  return haystack.toLowerCase().includes(clean(needle))
}

const STOP = new Set(
  ('this that with from have been were will would your their there about which while where using used uses into over under also ' +
    'more most some such than then them they what when whose very just only each both other these those being does done make makes made ' +
    'allows allow lets help helps provides provide enables enable built build builds based project application app tool system').split(' ')
)

const words = (s: string) => s.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*/g) ?? []
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '')

/**
 * One-sentence summaries only. Accept `summary` if
 *  - it is a single sentence of reasonable length with no URL / e-mail,
 *  - every number in it occurs in the source,
 *  - at least `minShare` of its content words (length >= 4, not generic) occur in the source (after crude stemming).
 * Purpose: block invented claims, metrics and names; paraphrase is allowed, new facts are not.
 */
export function isGrounded(summary: string, source: string, minShare = 0.75): boolean {
  const s = summary.trim()
  if (s.length < 15 || s.length > 220) return false
  if (/(https?:\/\/|www\.|@\w+\.\w+)/i.test(s)) return false
  if (/[.!?]\s+\S/.test(s)) return false // more than one sentence

  const src = new Set(words(source).map(stem))
  const srcRaw = new Set(words(source))
  for (const n of s.match(/\d[\d.,%]*/g) ?? []) {
    if (!source.includes(n)) return false
  }
  const content = words(s).filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d/.test(w))
  if (content.length === 0) return false
  const supported = content.filter((w) => srcRaw.has(w) || src.has(stem(w))).length
  return supported / content.length >= minShare
}
