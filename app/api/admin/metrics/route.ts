import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Simple secret token check — set ADMIN_METRICS_SECRET in .env.local
function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-metrics-secret')
  const secret = process.env.ADMIN_METRICS_SECRET
  if (!secret) return false
  return token === secret
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
    topViewed,
    recentSignups,
    recentPayments,
    templateStats,
  ] = await Promise.all([
    // Users
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last7.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last30.toISOString()),

    // Published (paying)
    db.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    db.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'pro').gte('published_at', today.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'pro').gte('published_at', last7.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).eq('plan', 'pro').gte('published_at', last30.toISOString()),

    // Email subscribers
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', today.toISOString()),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', last7.toISOString()),

    // Payments
    db.from('payments').select('amount_cents'),
    db.from('payments').select('amount_cents').gte('created_at', thisMonthStart.toISOString()),

    // Portfolios
    db.from('portfolios').select('view_count, health_score, template'),

    // Top 5 most viewed
    db.from('portfolios')
      .select('id, view_count, content->>name, template')
      .order('view_count', { ascending: false })
      .limit(5),

    // Recent 5 signups
    db.from('users')
      .select('email, slug, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(5),

    // Recent 5 payments
    db.from('payments')
      .select('amount_cents, product_tier, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5),

    // Template distribution
    db.from('portfolios').select('template'),
  ])

  // Revenue calculations
  const totalRevenueCents = (paymentsAll.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const monthRevenueCents = (paymentsThisMonth.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)

  // Portfolio stats
  const allPortfolios = portfoliosAll.data || []
  const avgHealthScore = allPortfolios.length
    ? Math.round(allPortfolios.reduce((s, p) => s + (p.health_score || 0), 0) / allPortfolios.length)
    : 0
  const totalViews = allPortfolios.reduce((s, p) => s + (p.view_count || 0), 0)

  // Template split
  const templateCounts = (templateStats.data || []).reduce((acc: Record<string, number>, p) => {
    acc[p.template] = (acc[p.template] || 0) + 1
    return acc
  }, {})

  // Conversion rate: paid / total signups
  const conversionRate = (usersTotal.count || 0) > 0
    ? (((published.count || 0) / (usersTotal.count || 0)) * 100).toFixed(1)
    : '0.0'

  return NextResponse.json({
    generated_at: now.toISOString(),
    users: {
      total: usersTotal.count || 0,
      today: usersToday.count || 0,
      last_7_days: usersLast7.count || 0,
      last_30_days: usersLast30.count || 0,
    },
    revenue: {
      total_usd: (totalRevenueCents / 100).toFixed(2),
      this_month_usd: (monthRevenueCents / 100).toFixed(2),
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
    top_viewed: (topViewed.data || []).map(p => ({
      name: p['content->>name'] || 'Unknown',
      views: p.view_count || 0,
      template: p.template,
    })),
    recent_signups: (recentSignups.data || []).map(u => ({
      email: u.email,
      slug: u.slug,
      plan: u.plan,
      joined: u.created_at,
    })),
    recent_payments: (recentPayments.data || []).map(p => ({
      amount_usd: ((p.amount_cents || 0) / 100).toFixed(2),
      tier: p.product_tier,
      date: p.created_at,
    })),
  })
}
