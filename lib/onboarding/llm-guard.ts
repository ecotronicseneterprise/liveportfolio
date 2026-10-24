import { NextResponse, type NextRequest } from 'next/server'
import { getUserFromRequest } from '@/lib/server-auth'
import { checkAndRecordUsage, type UsageKind } from '@/lib/usage'

export type GuardResult =
  | { ok: true; mode: 'user'; userId: string }
  | { ok: true; mode: 'anonymous' } // legacy wizard: the route keeps its old per-IP limits
  | { ok: false; response: NextResponse }

/**
 * Auth + per-user limit for the LLM-backed import routes.
 *  - A Bearer token (the new onboarding flow) must be valid and verified; the user is limited by usage_events.
 *  - No token: the old wizard, still anonymous, unchanged — UNLESS REQUIRE_AUTH_FOR_LLM=true, which you flip when the
 *    old wizard is retired.
 */
export async function guardLlmRoute(
  req: NextRequest,
  opts: { kind: UsageKind; limit: number; windowMs: number },
): Promise<GuardResult> {
  const hasToken = !!req.headers.get('authorization')
  if (!hasToken) {
    if (process.env.REQUIRE_AUTH_FOR_LLM === 'true') {
      return { ok: false, response: NextResponse.json({ error: 'unauthorized', message: 'Please sign in first.' }, { status: 401 }) }
    }
    return { ok: true, mode: 'anonymous' }
  }
  const user = await getUserFromRequest(req)
  if (!user) return { ok: false, response: NextResponse.json({ error: 'unauthorized', message: 'Please sign in again.' }, { status: 401 }) }
  if (!user.emailVerified) {
    return { ok: false, response: NextResponse.json({ error: 'unverified', message: 'Confirm your email first.' }, { status: 403 }) }
  }
  if ((await checkAndRecordUsage(user.id, opts.kind, opts.limit, opts.windowMs)) === 'limited') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'rate_limited', message: "You've reached today's import limit." }, { status: 429 }),
    }
  }
  return { ok: true, mode: 'user', userId: user.id }
}
