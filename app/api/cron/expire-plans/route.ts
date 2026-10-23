import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GRACE_MS = 3 * 24 * 60 * 60 * 1000 // covers delayed renewal webhooks

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const nowIso = now.toISOString()

  // 1. Bootcamp / time-boxed plans
  const { data: bootcampExpired, error } = await supabase
    .from('users')
    .select('id')
    .not('plan_expires_at', 'is', null)
    .lt('plan_expires_at', nowIso)
    .neq('plan', 'unpublished')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bootcampIds = (bootcampExpired ?? []).map((u) => u.id)

  // 2. Paid subscriptions past expiry + grace
  const cutoff = new Date(now.getTime() - GRACE_MS).toISOString()
  const { data: lapsedSubs, error: subError } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .in('status', ['active', 'cancelled'])
    .lt('expires_at', cutoff)

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  const lapsedSubIds = (lapsedSubs ?? []).map((s) => s.id)
  if (lapsedSubIds.length > 0) {
    await supabase.from('subscriptions').update({ status: 'expired' }).in('id', lapsedSubIds)
  }

  // Downgrade only users with no remaining valid subscription and no live time-boxed plan.
  // Users with neither (e.g. invite free-pro) are never touched.
  const subUserIds = Array.from(new Set((lapsedSubs ?? []).map((s) => s.user_id)))
  const subDowngrade: string[] = []
  for (const userId of subUserIds) {
    const { data: stillValid } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .gt('expires_at', nowIso)
      .limit(1)
      .maybeSingle()
    if (stillValid) continue

    const { data: u } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', userId)
      .maybeSingle()
    if (u?.plan_expires_at && u.plan_expires_at > nowIso) continue
    subDowngrade.push(userId)
  }

  const ids = Array.from(new Set([...bootcampIds, ...subDowngrade]))
  if (ids.length > 0) {
    await supabase.from('users').update({ plan: 'unpublished' }).in('id', ids)
  }

  console.log(`[expire-plans] downgraded ${ids.length} users (bootcamp ${bootcampIds.length}, subscription ${subDowngrade.length})`)
  return NextResponse.json({ ok: true, expired: ids.length })
}
