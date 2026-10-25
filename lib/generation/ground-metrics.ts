/** Extract numeric quantities without treating a substring (for example, 2 in 2024) as evidence. */
function numericFacts(text: string): string[] {
  const matches = text.match(/(?<![\d.,])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\d.,])/g) ?? []
  const digits = matches.map((value) => `digit:${String(Number(value.replace(/,/g, '')))}`)

  // Models sometimes spell out figures instead of using digits. Require the same written quantity in the source;
  // this intentionally prefers omitting a valid rewrite over accepting an ungrounded quantity.
  const numberWord = '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|dozen|twice|double|triple)'
  const written = [...text.matchAll(new RegExp(`\\b${numberWord}(?:[\\s-]+(?:and[\\s-]+)?${numberWord})*\\b`, 'gi'))]
    .filter((match) => {
      const words = match[0].toLowerCase().split(/[\s-]+/)
      const after = text.slice((match.index ?? 0) + match[0].length)
      return words.length > 1 || /\b(?:hundred|thousand|million|billion|trillion|half|quarter|dozen|twice|double|triple)\b/i.test(match[0]) || /^\s*(?:%|percent\b|per\b|users?\b|people\b|transactions?\b|requests?\b|hours?\b|days?\b|weeks?\b|months?\b|years?\b|teams?\b|projects?\b|customers?\b|records?\b)/i.test(after)
    })
    .map((match) => `words:${match[0].toLowerCase().replace(/[\s-]+/g, ' ')}`)

  return [...digits, ...written]
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
