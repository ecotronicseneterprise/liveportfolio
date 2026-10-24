// Per-user usage limits that survive serverless instances: one row per call in public.usage_events
// (supabase/manual/20261025110000_usage_events.sql — you run it). Until that table exists the code falls back to the
// in-process limiter and logs once, so deploying before the migration is safe (just weaker).
//
// Rows are only needed for the length of the longest window (a day), so ~2% of calls also delete rows older than 7 days.

import { getSupabaseAdmin } from '@/lib/supabase'
import { allow } from '@/lib/connectors/limits'

export type UsageKind = 'parse_cv' | 'import' | 'score'
type Admin = ReturnType<typeof getSupabaseAdmin>

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000
let warned = false

export async function checkAndRecordUsage(
  userId: string,
  kind: UsageKind,
  limit: number,
  windowMs: number,
  admin: Admin = getSupabaseAdmin(),
  random: () => number = Math.random,
): Promise<'ok' | 'limited'> {
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count, error } = await admin
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('at', since)

  if (error) {
    if (!warned) {
      warned = true
      console.error('[usage] usage_events unavailable, using the in-process limiter:', error.message)
    }
    return allow(`usage:${kind}:${userId}`, limit, windowMs) ? 'ok' : 'limited'
  }
  if ((count ?? 0) >= limit) return 'limited'

  const { error: insErr } = await admin.from('usage_events').insert({ user_id: userId, kind })
  if (insErr) console.error('[usage] could not record usage:', insErr.message)

  if (random() < 0.02) {
    const { error: delErr } = await admin.from('usage_events').delete().lt('at', new Date(Date.now() - RETENTION_MS).toISOString())
    if (delErr) console.error('[usage] purge failed:', delErr.message)
  }
  return 'ok'
}
