import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { entitlements } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    if (!portfolioId) return json({ error: 'Missing portfolioId' }, 400)
    const db = getSupabaseAdmin()
    const { data: portfolio, error: ownershipError } = await db.from('portfolios')
      .select('id').eq('id', portfolioId).eq('user_id', user.id).maybeSingle()
    if (ownershipError) return json({ error: 'Visits unavailable' }, 503)
    if (!portfolio) return json({ error: 'Not found' }, 404)
    if (!(await entitlements(user.id)).analytics) return json({ error: 'upgrade_required' }, 403)

    // One view row, independent of the chart period and not displaced by later click events.
    const { data: visit, error } = await db.from('analytics_events')
      .select('country, created_at').eq('portfolio_id', portfolioId).eq('event_type', 'portfolio_view')
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
    if (error) return json({ error: 'Visits unavailable' }, 503)
    return json({ visit: visit ? { country: visit.country?.trim() || null, time: visit.created_at } : null })
  } catch {
    return json({ error: 'Visits unavailable' }, 503)
  }
}
