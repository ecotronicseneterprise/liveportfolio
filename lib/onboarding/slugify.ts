import { SLUG_RE } from '@/lib/slug'

/** "Ada Okonkwo" → "ada-okonkwo". Latin letters only; anything else is dropped. Falls back to me-xxxx. */
export function slugFromName(name: string, random: () => number = Math.random): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '')
  if (SLUG_RE.test(base)) return base
  const rand = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0')
  return `me-${rand}`
}

/** Suggestions that are always valid in shape, trimmed to fit 30 characters. */
export function slugSuggestions(slug: string, taken: ReadonlySet<string> = new Set(), count = 3): string[] {
  const out: string[] = []
  const tails = ['-1', '-dev', '-io', '-2', '-me', '-hq']
  for (const t of tails) {
    const cand = (slug.slice(0, 30 - t.length).replace(/-+$/g, '') + t)
    if (SLUG_RE.test(cand) && !taken.has(cand) && !out.includes(cand)) out.push(cand)
    if (out.length >= count) break
  }
  return out
}
