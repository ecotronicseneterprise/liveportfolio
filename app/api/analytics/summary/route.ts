import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const portfolioId = req.nextUrl.searchParams.get('portfolioId')
    const userId = req.nextUrl.searchParams.get('userId')

    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // FIX 2: Verify Bearer token before any DB access
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
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
    const { data: ownership } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolioId)
      .eq('user_id', userId)
      .single()

    if (!ownership) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Single source of truth: analytics_events for all metrics.
    // One query, one date window (30 days), all metrics derived in-memory.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await supabaseAdmin
      .from('analytics_events')
      .select('event_type, label, referrer, company, country, ip_hash, created_at, device_type')
      .eq('portfolio_id', portfolioId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    const allEvents = events || []

    function classifyReferrer(ref: string | null): string | null {
      if (!ref) return null
      if (ref.includes('linkedin')) return 'LinkedIn'
      if (ref.includes('wa.me') || ref.includes('whatsapp')) return 'WhatsApp'
      if (ref.includes('twitter') || ref.includes('x.com') || ref.includes('t.co')) return 'Twitter/X'
      if (ref.includes('github')) return 'GitHub'
      if (ref.includes('google')) return 'Google'
      return 'Other'
    }

    // Isolate portfolio_view events — used for Views, Visitors, bar chart, and top sources
    const viewEvents = allEvents.filter((e) => e.event_type === 'portfolio_view')

    // FIX 1: totalViews from analytics_events, same window as Visitors
    const totalViews = viewEvents.length

    // Build last 7 actual calendar days (oldest → newest), all dates in UTC
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const last7Days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      last7Days.push(d.toISOString().slice(0, 10)) // YYYY-MM-DD UTC
    }

    // FIX 4: bar chart uses same viewEvents (portfolio_view only, last 30 days)
    const viewsByDay = last7Days.map((dateStr) =>
      viewEvents.filter((e) => e.created_at.slice(0, 10) === dateStr).length
    )

    const dayLabels = last7Days.map((dateStr) => {
      const d = new Date(dateStr + 'T00:00:00Z')
      return DAY_NAMES[d.getUTCDay()]
    })

    // Top referrer sources (portfolio_view events only, same viewEvents array)
    const referrerCounts: Record<string, number> = {}
    for (const e of viewEvents) {
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

    const totalReferrerEvents = Object.values(referrerCounts).reduce((a, b) => a + b, 0) || 1
    const topSources = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        pct: Math.round((count / totalReferrerEvents) * 100),
      }))

    // FIX 2: Unique visitors — distinct ip_hashes from portfolio_view events only
    const uniqueIpHashes = new Set(
      viewEvents.map((e) => (e as { ip_hash?: string }).ip_hash).filter(Boolean)
    )
    const totalUniqueVisitors = uniqueIpHashes.size

    // Recent visitors — deduplicated by ip_hash, most recent per unique visitor, max 5
    type RawEvent = {
      event_type: string
      label: string | null
      referrer: string | null
      company: string | null
      country: string | null
      ip_hash: string | null
      created_at: string
      device_type: string | null
    }
    const seenIpHashes = new Set<string>()
    const recentActivity: {
      event_type: string
      label: string | null
      company: string | null
      country: string | null
      referrer_source: string | null
      device_type: string | null
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
        referrer_source: classifyReferrer(e.referrer ?? null),
        device_type: (e as RawEvent).device_type ?? null,
        time: e.created_at,
      })
    }

    // FIX 5: Sanity guard — visitors can never exceed views by construction (both
    // derive from viewEvents), but this defensive clamp prevents regressions.
    const safeUniqueVisitors = Math.min(totalUniqueVisitors, totalViews)

    return NextResponse.json({
      viewsByDay,
      dayLabels,
      chartPeriod: 'last_30_days',
      topSources: topSources.length > 0 ? topSources : [{ label: 'Direct', pct: 100 }],
      recentActivity,
      totalViews,
      totalUniqueVisitors: safeUniqueVisitors,
      eventCount: allEvents.length,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
