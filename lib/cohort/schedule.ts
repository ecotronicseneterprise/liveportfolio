// Cohort access (bootcamp and university links): the e-mail schedule. Pure, so it can be tested without a database or a clock.
//
// A person who comes through a cohort link gets a paid plan for 6 months (users.plan + users.plan_expires_at, set by /api/bootcamp/redeem).
// The goal of the sequence is to turn that access into a paid plan before it ends, without ever misleading them: the copy says plainly
// what happens at the end and what keeping the portfolio live costs.
export const DAY_MS = 86_400_000
export const COHORT_MONTHS = 6

export type CohortStep =
  | 'welcome' // the moment they get access (sent by the redeem route; the cron is the fallback)
  | 'share' // day 3
  | 'cv' // day 14
  | 'fresh' // day 45
  | 'halfway' // about 3 months left
  | 'left30' | 'left14' | 'left7' | 'left1'
  | 'ended' // access has just ended
  | 'after14' | 'after45'

interface StepRule {
  step: CohortStep
  /** 'start': days since access began. 'left': days left. 'after': days since access ended. */
  basis: 'start' | 'left' | 'after'
  day: number
  /** How many days late the step may still be sent (the cron runs once a day; a missed run must not skip a step, an old one must not be sent). */
  window: number
}

// Order matters: when several steps are due in one run (a missed cron day), the earlier row wins and the next run sends the next one.
export const COHORT_RULES: readonly StepRule[] = [
  { step: 'welcome', basis: 'start', day: 0, window: 14 },
  { step: 'share', basis: 'start', day: 3, window: 3 },
  { step: 'cv', basis: 'start', day: 14, window: 4 },
  { step: 'fresh', basis: 'start', day: 45, window: 5 },
  { step: 'halfway', basis: 'left', day: 90, window: 5 },
  { step: 'left30', basis: 'left', day: 30, window: 3 },
  { step: 'left14', basis: 'left', day: 14, window: 2 },
  { step: 'left7', basis: 'left', day: 7, window: 2 },
  { step: 'left1', basis: 'left', day: 1, window: 0 },
  { step: 'ended', basis: 'after', day: 0, window: 3 },
  { step: 'after14', basis: 'after', day: 14, window: 4 },
  { step: 'after45', basis: 'after', day: 45, window: 5 },
] as const

/** When access began, from when it ends (the redeem route adds 6 calendar months). */
export function cohortStart(expiresAt: string | Date): Date {
  const d = new Date(expiresAt)
  d.setUTCMonth(d.getUTCMonth() - COHORT_MONTHS)
  return d
}

/** Whole days left, counted upwards (3 hours left is 1 day left); 0 once it has ended. */
export function daysLeft(expiresAt: string | Date, now: number = Date.now()): number {
  const t = new Date(expiresAt).getTime()
  return Number.isFinite(t) && t > now ? Math.ceil((t - now) / DAY_MS) : 0
}

/** The one step that is due now and not yet sent, or null. `sent` is the subscriber's sent_flows map (keys like `d_share`). */
export function nextCohortStep(expiresAt: string | Date, sent: Record<string, boolean> | null | undefined, now: number = Date.now()): CohortStep | null {
  const end = new Date(expiresAt).getTime()
  if (!Number.isFinite(end)) return null
  const start = cohortStart(expiresAt).getTime()
  const sinceStart = Math.floor((now - start) / DAY_MS)
  const left = daysLeft(expiresAt, now)
  const sinceEnd = now >= end ? Math.floor((now - end) / DAY_MS) : -1
  const done = sent ?? {}
  for (const r of COHORT_RULES) {
    if (done[`d_${r.step}`]) continue
    let due = false
    if (r.basis === 'start') due = now < end && sinceStart >= r.day && sinceStart <= r.day + r.window
    else if (r.basis === 'left') due = now < end && left <= r.day && left >= r.day - r.window && left > 0
    else due = sinceEnd >= r.day && sinceEnd <= r.day + r.window
    if (due) return r.step
  }
  return null
}

export const cohortKey = (step: CohortStep): string => `d_${step}`
