// Display helpers for a person's name. Pure.

const hasLetters = (s: string) => /\p{L}/u.test(s)
const isShouting = (s: string) => hasLetters(s) && s === s.toLocaleUpperCase() && s !== s.toLocaleLowerCase()

/**
 * CVs often put the name in capitals ("CHUKWUMA CLIFFORD NWANNA"). A name that is ALL capitals is shown in normal case
 * ("Chukwuma Clifford Nwanna"); a name with any lower-case letter is left exactly as written (McDonald, van der Berg, O'Brien).
 * Display and import only: it never rewrites what a person typed themselves.
 */
export function tidyName(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!isShouting(s)) return s
  // capitalise the first letter of every word, also after a hyphen or an apostrophe
  return s.toLocaleLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase())
}

/** The letter shown in an avatar circle: the first letter of the NAME, and only if there is no name, of the e-mail address. */
export function initialOf(name: string | null | undefined, email: string): string {
  const pick = (s: string) => (s.match(/\p{L}/u)?.[0] ?? '').toLocaleUpperCase()
  return pick(name ?? '') || pick(email) || '?'
}
