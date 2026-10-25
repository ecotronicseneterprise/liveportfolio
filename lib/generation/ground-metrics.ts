/** Extract numeric quantities without treating a substring (for example, 2 in 2024) as evidence. */
function numericFacts(text: string): string[] {
  const matches = text.match(/(?<![\d.,])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\d.,])/g) ?? []
  return matches.map((value) => String(Number(value.replace(/,/g, ''))))
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Keep model prose that has no numbers. If a generated sentence contains numbers, only retain it by replacing it with
 * the exact source sentence that supports every number in it. This prevents the model from changing a supplied metric
 * or attaching it to a different claim. Unsupported numeric sentences are dropped.
 */
export function groundMetricSentences(generated: unknown, source: string, fallback: string): string {
  if (typeof generated !== 'string' || !generated.trim()) return fallback

  const sourceSentences = sentences(source)
  const grounded = sentences(generated).flatMap((sentence) => {
    const facts = numericFacts(sentence)
    if (facts.length === 0) return [sentence]

    const evidence = sourceSentences.find((sourceSentence) => {
      const sourceFacts = new Set(numericFacts(sourceSentence))
      return facts.every((fact) => sourceFacts.has(fact))
    })
    return evidence ? [evidence] : []
  })

  return grounded.join(' ').trim() || fallback
}
