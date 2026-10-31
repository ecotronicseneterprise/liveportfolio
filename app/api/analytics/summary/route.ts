import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { entitlements } from '@/lib/entitlements'
import { analyticsWindow, summarizeAnalytics } from '@/lib/analytics/summary'

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
    const { data: events, error, count } = await supabaseAdmin
      .from('analytics_events')
      .select('event_type, label, referrer, company, country, ip_hash, created_at, device_type', { count: 'exact' })
      .eq('portfolio_id', portfolioId)
      .gte('created_at', window.comparisonStart)
      .lte('created_at', window.periodEnd)
      .order('created_at', { ascending: false })

    // Supabase can cap returned rows: never present a truncated read as complete totals.
    if (error || !events || (count !== null && count !== events.length)) {
      return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
    }

    return NextResponse.json(summarizeAnalytics(events, window, ownership.created_at ?? null))
  } catch {
    return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 })
  }
}
