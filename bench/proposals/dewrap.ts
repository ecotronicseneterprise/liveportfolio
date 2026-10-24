// PROPOSAL (prototype): rejoin URLs that PDF extraction wrapped across lines, before the regexes run.
// Measured problem: "www.linkedin.com/in/ines-dubois-\nsynth-01" was captured as ".../in/ines-dubois-"
// (11 of 44 synthetic docs, 9 of them PDFs).
//
// Rule: a line that ENDS inside a URL-looking token on a break character ("-", "/", "_", ".", "%") and
// whose next line starts with a URL-safe fragment (no spaces before the first break) is joined.
// Deliberately narrow: only tokens that already look like a URL (scheme, www., or a known host path),
// so ordinary hyphenated prose ("state-\nof-the-art") is left untouched.

const URL_TAIL = /((?:https?:\/\/|www\.|(?:[a-z]{2,3}\.)?linkedin\.com\/|github\.com\/|gitlab\.com\/|[a-z0-9-]+\.(?:com|org|dev|me|app|site|xyz|ng|tech)\/)[^\s]*[-/_.%])$/i
const FRAGMENT = /^([A-Za-z0-9][A-Za-z0-9._~%/-]*)(.*)$/

export function dewrapUrls(text: string): string {
  const lines = text.split(String.fromCharCode(10))
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let cur = lines[i]
    // a wrapped URL may span more than two lines
    while (i + 1 < lines.length && URL_TAIL.test(cur.trimEnd())) {
      const m = FRAGMENT.exec(lines[i + 1].trimStart())
      if (!m) break
      const [, frag, rest] = m
      cur = cur.trimEnd() + frag
      if (rest.trim()) {
        // the next line continues with other text: keep it as its own line
        lines[i + 1] = rest.trimStart()
        break
      }
      i++
    }
    out.push(cur)
  }
  return out.join(String.fromCharCode(10))
}
