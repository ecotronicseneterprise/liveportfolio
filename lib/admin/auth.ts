// Who may use the admin dashboard. Not a shared username and password (a fixed login on a public site would give anyone who guesses it every
// user's e-mail and the power to hand out free plans): it is YOUR own account, signed in the normal way, with a verified e-mail that is on the
// owner list. The list is ADMIN_EMAILS (comma separated) and, if that is not set, PAYSTACK_TEST_EMAIL (the owner account you already use for the
// N500 test). Server only.
import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { getUserFromRequest } from '@/lib/server-auth'

export function adminEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.ADMIN_EMAILS || env.PAYSTACK_TEST_EMAIL || '').toLowerCase()
  return raw.split(',').map((e) => e.trim()).filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const e = (email ?? '').trim().toLowerCase()
  return !!e && adminEmails(env).includes(e)
}

/** The signed-in owner, or null. Requires a valid token AND a verified e-mail AND membership of the owner list. */
export async function adminFromRequest(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const user = await getUserFromRequest(req)
  if (!user || !user.email || !user.emailVerified) return null
  return isAdminEmail(user.email) ? { id: user.id, email: user.email } : null
}

/** The shared operations secret (CRON_SECRET) in x-cron-secret / x-metrics-secret, for scripts. Constant-time. */
export function hasOpsSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || ''
  const provided = req.headers.get('x-cron-secret') || req.headers.get('x-metrics-secret') || ''
  if (!expected || provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

/** Either way in: the owner signed in, or the operations secret. */
export async function adminAuthorised(req: NextRequest): Promise<boolean> {
  return hasOpsSecret(req) || !!(await adminFromRequest(req))
}
