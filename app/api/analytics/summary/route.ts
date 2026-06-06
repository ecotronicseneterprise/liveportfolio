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
      .select('event_type, label, referrer, company, country, ip_hash, created_at')
      .eq('portfolio_id', portfolioId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    const allEvents = events || []

    // Build 7-day bar chart — bucket portfolio_view events by day-of-week
    const dayBuckets = [0, 0, 0, 0, 0, 0, 0] // Sun=0 … Sat=6
    for (const e of allEvents) {
      if (e.event_type === 'portfolio_view') {
        dayBuckets[new Date(e.created_at).getDay()]++
      }
    }
    // Re-order Mon–Sun
    const viewsByDay = [
      dayBuckets[1], dayBuckets[2], dayBuckets[3], dayBuckets[4],
      dayBuckets[5], dayBuckets[6], dayBuckets[0],
    ]

    // Top referrer sources (portfolio_view events only)
    const referrerCounts: Record<string, number> = {}
    for (const e of allEvents) {
      if (e.event_type !== 'portfolio_view') continue
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

    // Unique visitors — distinct ip_hash values across all events
    const uniqueIpHashes = new Set(allEvents.map((e) => (e as { ip_hash?: string }).ip_hash).filter(Boolean))
    const totalUniqueVisitors = uniqueIpHashes.size

    // Recent visitors — deduplicated by ip_hash, most recent per unique visitor, max 5
    type RawEvent = {
      event_type: string
      label: string | null
      company: string | null
      country: string | null
      ip_hash: string | null
      created_at: string
    }
    const seenIpHashes = new Set<string>()
    const recentActivity: {
      event_type: string
      label: string | null
      company: string | null
      country: string | null
      time: string
    }[] = []

    for (const e of allEvents as RawEvent[]) {
      if (recentActivity.length >= 5) break
      const ipKey = e.ip_hash ?? `anon_${recentActivity.length}`
      if (seenIpHashes.has(ipKey)) continue
      seenIpHashes.add(ipKey)
      recentActivity.push({
        event_type: e.event_type,
        label: e.label ?? null,
        company: e.company ?? null,
        country: e.country ?? null,
        time: e.created_at,
      })
    }

    return NextResponse.json({
      viewsByDay,
      topSources: topSources.length > 0 ? topSources : [{ label: 'Direct', pct: 100 }],
      recentActivity,
      totalUniqueVisitors,
      eventCount: allEvents.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
