import { getUserPlan } from '@/lib/getUserPlan'
import { entitlementsFor, type Entitlements } from '@/lib/plans'

/**
 * The single server-side check. Every route that gates a plan feature calls this and nothing else.
 * Source today: subscriptions (active, or cancelled until expires_at) first, then users.plan. NOTE: users.plan is a
 * cache the browser can still write until the RLS migration (supabase/manual/20261024120000_close_browser_writes.sql)
 * has run, so until then the paywall can be bypassed by editing your own row; run that migration before relying on this.
 */
export async function entitlements(userId: string): Promise<Entitlements> {
  return entitlementsFor(await getUserPlan(userId))
}
