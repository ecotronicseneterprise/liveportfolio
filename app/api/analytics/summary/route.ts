import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { entitlements } from '@/lib/entitlements'
import { analyticsWindow, summarizeAnalytics, type AnalyticsEvent } from '@/lib/analytics/summary'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    const userId = req.nextUrl.searchParams.get('userId')
    const period = req.nextUrl.searchParams.get('period') ?? '30'
    if (period !== '7' && period !== '30') {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // FIX 2: Verify Bearer token before any DB access
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Ownership check — ensure the portfolio belongs to this user
    const { data: ownership, error: ownershipError } = await supabaseAdmin
      .from('portfolios')
      .select('id, created_at')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .maybeSingle()

    if (ownershipError) {
      return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
    }
    if (!ownership) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Visitor analytics is a Pro feature: enforced here, not only in the UI.
    if (!(await entitlements(userId)).analytics) {
      return NextResponse.json({ error: 'upgrade_required', feature: 'analytics' }, { status: 403 })
    }

    const window = analyticsWindow(period === '7' ? 7 : 30, new Date())
    // The database returns at most 1,000 rows per request, and two periods of traffic can exceed that: read page by page until
    // everything is in. Never present a truncated read as complete totals; if it is somehow still too large, say unavailable.
    const PAGE = 1000
    const MAX_PAGES = 30
    const events: AnalyticsEvent[] = []
    for (let page = 0; ; page++) {
      if (page >= MAX_PAGES) return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
      const { data, error } = await supabaseAdmin
        .from('analytics_events')
        .select('event_type, label, referrer, company, country, ip_hash, created_at, device_type')
        .eq('portfolio_id', portfolioId)
        .gte('created_at', window.comparisonStart)
        .lte('created_at', window.periodEnd)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      if (error || !data) return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
      events.push(...(data as AnalyticsEvent[]))
      if (data.length < PAGE) break
    }

    return NextResponse.json(summarizeAnalytics(events, window, ownership.created_at ?? null))
  } catch {
    return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
  }
}
