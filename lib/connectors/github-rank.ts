// Project ranking for the GitHub connector. Pure functions; every weight is a named constant.
// Designed from first principles (no code taken from other projects): on real accounts most repos have
// 0–2 stars, so stars are only a tie-breaker; "is this a real, recent, described, shipped project?" decides.

export interface RepoFacts {
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  pushed_at: string
  size: number // KB
  homepage: string | null
  topics?: string[]
  language: string | null
  fork: boolean
  archived: boolean
}

export const RANK = {
  /** push recency: weight × e^(-age_days / HALF_LIFE_DAYS). A repo pushed today earns the full weight. */
  recencyWeight: 3,
  recencyDecayDays: 365,
  /** description: ≥ LONG chars is real prose; < MIN chars is a placeholder ("Assessment"). */
  descLong: 60, descLongPts: 2, descMid: 25, descMidPts: 1, descMin: 10, descMinPts: 0.25, descMissingPts: -1,
  /** a README exists (checked only for the best prelim candidates, when quota allows) */
  readmePts: 1,
  /** a homepage/demo link is the strongest "this shipped" signal */
  homepagePts: 2,
  /** topics: pts per topic, capped */
  topicPts: 0.3, topicCap: 5,
  /** repo size in KB: below TRIVIAL it is a stub; above that, log-scaled up to SIZE_FULL_KB */
  sizeTrivialKb: 10, sizeTrivialPts: -1.5, sizeMaxPts: 1.5, sizeFullKb: 1000,
  /** stars: tie-breaker only */
  starPts: 0.7,
  /** name looks like a placeholder / tutorial / config repo */
  placeholderPenalty: -3,
  /** how many candidates are shown, how many are pre-ticked, and the floor for being pre-ticked */
  candidateCount: 10, selectedCount: 4, selectMinScore: 3,
  /** how many prelim-best repos get a README-existence check */
  readmeChecks: 15,
} as const

const PLACEHOLDER_NAME = /^(profile|python|projects?|toolbelt|-?sql|test|tests|demo|sandbox|playground|notes|dotfiles|config)$|bootcamp|tutorial|assessment|learning|practice|homework|exercise/i

export const normalizeName = (s: string) => s.toLowerCase()

/** Repos that should never be offered: the profile README repo, `.github`, and (unless it is the only live site) <login>.github.io. */
export function isProfileOrSiteRepo(name: string, login: string, hasOtherLiveSite: boolean): boolean {
  const n = name.toLowerCase(), l = login.toLowerCase()
  if (n === l || n === '.github') return true
  if (n === `${l}.github.io`) return hasOtherLiveSite
  return false
}

export function scoreRepo(r: RepoFacts, o: { now: number; hasReadme?: boolean }): number {
  const ageDays = Math.max(0, (o.now - Date.parse(r.pushed_at)) / 864e5)
  let s = RANK.recencyWeight * Math.exp(-ageDays / RANK.recencyDecayDays)

  const dl = (r.description ?? '').trim().length
  s += dl >= RANK.descLong ? RANK.descLongPts : dl >= RANK.descMid ? RANK.descMidPts : dl >= RANK.descMin ? RANK.descMinPts : RANK.descMissingPts

  if (o.hasReadme) s += RANK.readmePts
  if (r.homepage) s += RANK.homepagePts
  s += Math.min(RANK.topicCap, (r.topics ?? []).length) * RANK.topicPts

  s += r.size < RANK.sizeTrivialKb
    ? RANK.sizeTrivialPts
    : Math.min(RANK.sizeMaxPts, (Math.log10(r.size + 1) / Math.log10(RANK.sizeFullKb + 1)) * RANK.sizeMaxPts)

  s += RANK.starPts * Math.log2(1 + r.stargazers_count)
  if (PLACEHOLDER_NAME.test(r.name)) s += RANK.placeholderPenalty
  return s
}

export interface Ranked<T extends RepoFacts = RepoFacts> { repo: T; score: number; selected: boolean }

/** Score, sort (score desc, then name for a stable order), take the top N and flag the best few. */
export function rankRepos<T extends RepoFacts>(
  repos: T[],
  o: { now: number; readme?: Set<string> }
): Ranked<T>[] {
  const scored = repos
    .map((repo) => ({ repo, score: scoreRepo(repo, { now: o.now, hasReadme: o.readme?.has(repo.full_name) }) }))
    .sort((a, b) => b.score - a.score || a.repo.name.localeCompare(b.repo.name))
    .slice(0, RANK.candidateCount)
  let picked = 0
  return scored.map((x) => {
    const selected = picked < RANK.selectedCount && x.score >= RANK.selectMinScore
    if (selected) picked++
    return { ...x, selected }
  })
}
