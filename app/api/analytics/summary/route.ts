import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Ownership check — ensure the portfolio belongs to this user
    const { data: ownership } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single()

    if (!ownership) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Views per day for the last 30 days from analytics_events
    // We use the existing view_count on portfolios for the total, but build a daily
    // breakdown from analytics_events where event_type = 'view' (if present).
    // Since the current analytics route increments view_count via batch flush and doesn't
    // write to analytics_events, we derive the bar chart from the total and a synthetic
    // 7-day bucket using last_viewed_at as a proxy until full event-level data accumulates.

    // Pull the last 30 days of raw events for click tracking
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await supabaseAdmin
      .from('analytics_events')
      .select('event_type, label, referrer, company, country, created_at')
      .eq('portfolio_id', portfolioId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    // Build 7-day views bar chart from events (event_type = 'view' once wired)
    // For now: bucket all events by day-of-week as a proxy for activity
    const dayBuckets = [0, 0, 0, 0, 0, 0, 0] // Sun=0 … Sat=6
    for (const e of events || []) {
      const d = new Date(e.created_at).getDay()
      dayBuckets[d]++
    }
    // Re-order Mon–Sun
    const viewsByDay = [
      dayBuckets[1], dayBuckets[2], dayBuckets[3], dayBuckets[4],
      dayBuckets[5], dayBuckets[6], dayBuckets[0],
    ]

    // Top referrer sources
    const referrerCounts: Record<string, number> = {}
    for (const e of events || []) {
      const ref = e.referrer
      let source = 'Direct'
      if (ref) {
        if (ref.includes('linkedin')) source = 'LinkedIn'
        else if (ref.includes('wa.me') || ref.includes('whatsapp')) source = 'WhatsApp'
        else if (ref.includes('twitter') || ref.includes('x.com')) source = 'Twitter/X'
        else if (ref.includes('github')) source = 'GitHub'
        else if (ref.includes('google')) source = 'Google'
        else source = 'Other'
      }
      referrerCounts[source] = (referrerCounts[source] || 0) + 1
    }

    const totalEvents = Object.values(referrerCounts).reduce((a, b) => a + b, 0) || 1
    const topSources = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        pct: Math.round((count / totalEvents) * 100),
      }))

    // Recent activity — portfolio views + link clicks, last 10
    const recentActivity = (events || [])
      .filter((e) =>
        e.event_type === 'portfolio_view' ||
        e.event_type === 'link_click' ||
        e.event_type === 'github' ||
        e.event_type === 'linkedin' ||
        e.event_type === 'email' ||
        e.event_type === 'project_url'
      )
      .slice(0, 10)
      .map((e) => ({
        event_type: e.event_type,
        label: e.label ?? null,
        company: (e as { company?: string | null }).company ?? null,
        country: (e as { country?: string | null }).country ?? null,
        time: e.created_at,
      }))

    return NextResponse.json({
      viewsByDay,
      topSources: topSources.length > 0 ? topSources : [{ label: 'Direct', pct: 100 }],
      recentActivity,
      eventCount: events?.length || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
