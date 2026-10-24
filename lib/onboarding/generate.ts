// Generate step: build the /api/generate payload from the REVIEWED draft and call it with retries.
// /api/generate is protected and unchanged: it already returns the existing portfolio when one exists, which is what
// makes retrying safe (a request that finished after the browser gave up is simply returned on the next try).

import type { Draft } from './draft'

export function draftToGeneratePayload(d: Draft, email: string) {
  const list = (csv: string) => csv.split(',').map((x) => x.trim()).filter(Boolean)
  return {
    name: d.name,
    role: d.role,
    bio: d.bio,
    location: d.location,
    email,
    github_url: d.github_url || undefined,
    linkedin_url: d.linkedin_url || undefined,
    skills: d.skills,
    certifications: d.certifications.length ? d.certifications : undefined,
    education: d.education.filter((e) => e.degree.trim()).map((e) => ({
      degree: e.degree, institution: e.institution, year: e.year, grade: e.grade || undefined,
    })),
    projects: d.projects.filter((p) => p.title.trim()).map((p) => ({
      title: p.title, description: p.description, stack: list(p.stack), url: p.url || undefined,
    })),
    experience: d.experience.filter((e) => e.company.trim() || e.role.trim()).map((e) => ({
      company: e.company, role: e.role, period: e.period, bullets: e.bullets.split('\n').map((b) => b.trim()).filter(Boolean),
    })),
    template: d.template,
  }
}

export type GenerateResult =
  | { ok: true; portfolioId: string; attempts: number }
  | { ok: false; reason: 'unauthorized' | 'bad_request' | 'rate_limited' | 'failed'; attempts: number; message?: string }

/**
 * Calls `call()` up to `tries` times. Network errors, 5xx and 504 are "still working", not failure. 401, 400 and 429
 * stop immediately (retrying cannot help). A 200 without a portfolio id is treated as a failed attempt.
 */
export async function generateWithRetry(
  call: () => Promise<Response>,
  opts: { tries?: number; wait?: (attempt: number) => Promise<void> } = {},
): Promise<GenerateResult> {
  const tries = opts.tries ?? 3
  const wait = opts.wait ?? ((n: number) => new Promise<void>((r) => setTimeout(r, 1500 * n)))
  let attempts = 0
  for (let i = 1; i <= tries; i++) {
    attempts = i
    try {
      const res = await call()
      if (res.status === 401) return { ok: false, reason: 'unauthorized', attempts }
      if (res.status === 429) return { ok: false, reason: 'rate_limited', attempts }
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}))
        return { ok: false, reason: 'bad_request', attempts, message: typeof body.error === 'string' ? body.error : undefined }
      }
      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        if (typeof body.portfolio_id === 'string' && body.portfolio_id) return { ok: true, portfolioId: body.portfolio_id, attempts }
      }
      // 5xx / 504 / odd 200: fall through to retry
    } catch {
      // network error: retry
    }
    if (i < tries) await wait(i)
  }
  return { ok: false, reason: 'failed', attempts }
}
