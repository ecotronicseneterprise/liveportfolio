import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// FIX 7: Timing-safe secret check — set ADMIN_METRICS_SECRET in .env.local
function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-metrics-secret') || ''
  const secret = process.env.ADMIN_METRICS_SECRET || ''
  if (!secret) return false
  if (token.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const last7 = new Date(today)
  last7.setDate(last7.getDate() - 7)
  const last30 = new Date(today)
  last30.setDate(last30.getDate() - 30)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const last30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    usersTotal,
    usersToday,
    usersLast7,
    usersLast30,
    published,
    publishedToday,
    publishedLast7,
    publishedLast30,
    subscribersTotal,
    subscribersToday,
    subscribersLast7,
    paymentsAll,
    paymentsThisMonth,
    portfoliosAll,
    allTimeViewEvents,
    topViewedThisWeek,
    recentSignups,
    recentPayments,
    templateStats,
    // Subscription health
    activeBasic,
    activePro,
    cancelledThisMonth,
    expiringIn30,
    // Total portfolio_view count all-time
    totalViewsResult,
    // Career scores this month
    careerScoresThisMonth,
    // Free users with unpublished portfolios
    freeUnpublished,
  ] = await Promise.all([
    // Users
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last7.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last30.toISOString()),

    // Published (paying)
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished'),
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished').gte('published_at', today.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished').gte('published_at', last7.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished').gte('published_at', last30.toISOString()),

    // Email subscribers
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', today.toISOString()),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', last7.toISOString()),

    // Payments — FIX 2: use proper month boundary for this_month count
    db.from('payments').select('amount_cents'),
    db.from('payments').select('amount_cents')
      .gte('created_at', thisMonthStart.toISOString())
      .lt('created_at', thisMonthEnd.toISOString()),

    // Portfolios — health score and template distribution (view_count no longer maintained)
    db.from('portfolios').select('health_score, template'),

    // Top 5 most viewed all time — all portfolio_view events, no date cap (all-time cumulative)
    db.from('analytics_events')
      .select('portfolio_id')
      .eq('event_type', 'portfolio_view'),

    // Top viewed this week (from analytics_events)
    db.from('analytics_events')
      .select('portfolio_id')
      .eq('event_type', 'portfolio_view')
      .gte('created_at', last7DaysAgo.toISOString())
      // Safety cap: analytics_events can grow quickly; avoid pulling unbounded rows.
      .limit(5000),

    // All signups — used for full list + CSV export in health report
    db.from('users')
      .select('email, slug, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),

    // Recent 5 payments
    db.from('payments')
      .select('amount_cents, product_tier, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5),

    // Template distribution
    db.from('portfolios').select('template'),

    // FIX 3: Subscription health
    db.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('plan', 'basic').eq('status', 'active').gt('expires_at', now.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('plan', 'pro').eq('status', 'active').gt('expires_at', now.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('updated_at', thisMonthStart.toISOString())
      .lt('updated_at', thisMonthEnd.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .lt('expires_at', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()),

    // Total portfolio_view events all-time — single source of truth since view_count no longer increments
    db.from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'portfolio_view'),

    // FIX 6: Career scores this month
    db.from('career_scores').select('id', { count: 'exact', head: true })
      .gte('scored_at', thisMonthStart.toISOString())
      .lt('scored_at', thisMonthEnd.toISOString()),

    // FIX 6: Free users with unpublished portfolios (most recent 3)
    db.from('users')
      .select('email, created_at')
      .eq('plan', 'unpublished')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  // FIX 1: Revenue in NGN — amount_cents is kobo (Paystack), divide by 100 for NGN
  const totalRevenueKobo = (paymentsAll.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const monthRevenueKobo = (paymentsThisMonth.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)

  // Portfolio stats — health and template only; view_count no longer maintained
  const allPortfolios = portfoliosAll.data || []
  const avgHealthScore = allPortfolios.length
    ? Math.round(allPortfolios.reduce((s, p) => s + (p.health_score || 0), 0) / allPortfolios.length)
    : 0
  // All-time total views from analytics_events — single source of truth
  const totalViews = totalViewsResult.count ?? 0

  // Template split
  const templateCounts = (templateStats.data || []).reduce((acc: Record<string, number>, p) => {
    acc[p.template] = (acc[p.template] || 0) + 1
    return acc
  }, {})

  // Conversion rate: paid / total signups
  const conversionRate = (usersTotal.count || 0) > 0
    ? (((published.count || 0) / (usersTotal.count || 0)) * 100).toFixed(1)
    : '0.0'

  // Unique visitors — disabled (unbounded ip_hash fetch would destabilize the server)
  const uniqueIpHashes = new Set<string>()

  // Top 5 portfolios all-time — group allTimeViewEvents by portfolio_id, then look up names
  const allTimeViewCounts: Record<string, number> = {}
  for (const e of (allTimeViewEvents.data || [])) {
    allTimeViewCounts[e.portfolio_id] = (allTimeViewCounts[e.portfolio_id] || 0) + 1
  }
  const topAllTimeIds = Object.entries(allTimeViewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, count }))

  const topViewedAllTime: { name: string; views: number; template: string }[] = []
  for (const { id, count } of topAllTimeIds) {
    const { data: pData } = await db
      .from('portfolios')
      .select('content, template')
      .eq('id', id)
      .single()
    topViewedAllTime.push({
      name: (pData?.content as Record<string, string> | null)?.name ?? 'Unknown',
      views: count,
      template: pData?.template ?? 'unknown',
    })
  }

  // Top portfolio this week by analytics_events count (best-effort, capped at 5000 rows)
  let topThisWeekName: string | null = null
  let topThisWeekViews = 0
  try {
    const weekViewCounts: Record<string, number> = {}
    for (const e of (topViewedThisWeek.data || [])) {
      weekViewCounts[e.portfolio_id] = (weekViewCounts[e.portfolio_id] || 0) + 1
    }
    const topThisWeekId = Object.entries(weekViewCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    if (topThisWeekId) {
      const { data: twData } = await db.from('portfolios').select('content').eq('id', topThisWeekId).single()
      topThisWeekName = (twData?.content as Record<string, string> | null)?.name ?? 'Unknown'
      topThisWeekViews = weekViewCounts[topThisWeekId] || 0
    }
  } catch {
    topThisWeekName = null
    topThisWeekViews = 0
  }

  // FIX 6: Free unpublished users with days since signup
  const freeUnpublishedList = (freeUnpublished.data || []).map((u: { email: string; created_at: string }) => {
    const daysSince = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / 86400000)
    return { email: u.email, days_since_signup: daysSince }
  })

  return NextResponse.json({
    generated_at: now.toISOString(),
    users: {
      total: usersTotal.count || 0,
      today: usersToday.count || 0,
      last_7_days: usersLast7.count || 0,
      last_30_days: usersLast30.count || 0,
    },
    // FIX 1: all revenue fields now in NGN
    revenue: {
      total_ngn: (totalRevenueKobo / 100).toFixed(2),
      this_month_ngn: (monthRevenueKobo / 100).toFixed(2),
      total_payments: paymentsAll.data?.length || 0,
      this_month_payments: paymentsThisMonth.data?.length || 0,
    },
    published: {
      total: published.count || 0,
      today: publishedToday.count || 0,
      last_7_days: publishedLast7.count || 0,
      last_30_days: publishedLast30.count || 0,
      conversion_rate_pct: conversionRate,
    },
    subscribers: {
      total: subscribersTotal.count || 0,
      today: subscribersToday.count || 0,
      last_7_days: subscribersLast7.count || 0,
    },
    portfolios: {
      total: allPortfolios.length,
      total_views: totalViews,
      avg_health_score: avgHealthScore,
      template_minimal: templateCounts['minimal'] || 0,
      template_bold: templateCounts['bold'] || 0,
    },
    // FIX 3: subscription health
    subscriptions: {
      active_basic: activeBasic.count || 0,
      active_pro: activePro.count || 0,
      cancelled_this_month: cancelledThisMonth.count || 0,
      expiring_in_30_days: expiringIn30.count || 0,
    },
    // FIX 6: additional data points
    analytics: {
      unique_visitors_30d: uniqueIpHashes.size,
      career_scores_this_month: careerScoresThisMonth.count || 0,
      free_unpublished_count: usersTotal.count ? ((usersTotal.count) - (published.count || 0)) : 0,
      top_viewed_this_week: topThisWeekName
        ? { name: topThisWeekName, views: topThisWeekViews }
        : null,
      free_unpublished_sample: freeUnpublishedList,
    },
    top_viewed: topViewedAllTime,
    recent_signups: (recentSignups.data || []).slice(0, 5).map(u => ({
      email: u.email,
      slug: u.slug,
      plan: u.plan,
      joined: u.created_at,
    })),
    all_signups: (recentSignups.data || []).map(u => ({
      email: u.email,
      slug: u.slug,
      plan: u.plan,
      joined: u.created_at,
    })),
    recent_payments: (recentPayments.data || []).map(p => ({
      amount_ngn: ((p.amount_cents || 0) / 100).toFixed(2),
      tier: p.product_tier,
      date: p.created_at,
    })),
  })
}
