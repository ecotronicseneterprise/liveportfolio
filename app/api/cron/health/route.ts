import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
const ALERT_EMAIL = 'nwannachumaclifford@gmail.com'
const GOAL = 500000
const GOAL_LABEL = '₦500,000'

function authorize(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || ''
  if (!expected) return false
  const fromHeader = req.headers.get('x-cron-secret') || ''
  const fromBearer = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const provided = fromHeader || fromBearer
  if (provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '?'
  return n.toLocaleString()
}

function fmtNgn(cents: number): string {
  return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function cell(label: string, value: string, sub?: string, color = '#111827'): string {
  return `
    <td style="padding:14px;border:1px solid #e5e7eb;border-radius:8px;vertical-align:top">
      <div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:6px">${label}</div>
      <div style="font-size:24px;font-weight:800;color:${color};font-family:Arial,sans-serif;line-height:1">${value}</div>
      ${sub ? `<div style="font-size:11px;color:#6b7280;font-family:Arial,sans-serif;margin-top:4px">${sub}</div>` : ''}
    </td>
  `
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const last7 = new Date(today); last7.setDate(last7.getDate() - 7)
  const last30 = new Date(today); last30.setDate(last30.getDate() - 30)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const last7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    usersTotal, usersToday, usersLast7, usersLast30,
    published, publishedLast7,
    subsTotal, subsToday, subsLast7,
    paymentsAll, paymentsMonth,
    portfolios,
    viewsTotal,
    recentSignups, recentPayments,
    activeBasic, activePro, cancelledMonth, expiringIn30,
    careerScores,
    freeUnpub,
    topViewedWeek,
  ] = await Promise.all([
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last7.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', last30.toISOString()),
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished'),
    db.from('users').select('id', { count: 'exact', head: true }).not('plan', 'eq', 'unpublished').gte('published_at', last7.toISOString()),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', today.toISOString()),
    db.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('subscribed', true).gte('created_at', last7.toISOString()),
    db.from('payments').select('amount_cents'),
    db.from('payments').select('amount_cents').gte('created_at', thisMonthStart.toISOString()).lt('created_at', thisMonthEnd.toISOString()),
    db.from('portfolios').select('health_score, template'),
    db.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'portfolio_view'),
    db.from('users').select('email, slug, plan, created_at').order('created_at', { ascending: false }).limit(5),
    db.from('payments').select('amount_cents, product_tier, created_at').order('created_at', { ascending: false }).limit(5),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'basic').eq('status', 'active').gt('expires_at', now.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active').gt('expires_at', now.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled').gte('updated_at', thisMonthStart.toISOString()).lt('updated_at', thisMonthEnd.toISOString()),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now.toISOString()).lt('expires_at', in30.toISOString()),
    db.from('career_scores').select('id', { count: 'exact', head: true }).gte('scored_at', thisMonthStart.toISOString()).lt('scored_at', thisMonthEnd.toISOString()),
    db.from('users').select('email, created_at').eq('plan', 'unpublished').order('created_at', { ascending: false }).limit(5),
    db.from('analytics_events').select('portfolio_id').eq('event_type', 'portfolio_view').gte('created_at', last7Ago.toISOString()).limit(5000),
  ])

  // Revenue
  const revTotal = (paymentsAll.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const revMonth = (paymentsMonth.data || []).reduce((s, p) => s + (p.amount_cents || 0), 0)
  const payCount = paymentsAll.data?.length ?? 0
  const payMonthCount = paymentsMonth.data?.length ?? 0

  // Portfolio stats
  const portfolioList = portfolios.data || []
  const avgHealth = portfolioList.length
    ? Math.round(portfolioList.reduce((s, p) => s + (p.health_score || 0), 0) / portfolioList.length)
    : 0
  const tplMinimal = portfolioList.filter(p => p.template === 'minimal').length
  const tplBold = portfolioList.filter(p => p.template === 'bold').length

  // Top portfolio this week
  const weekCounts: Record<string, number> = {}
  for (const e of topViewedWeek.data || []) {
    weekCounts[e.portfolio_id] = (weekCounts[e.portfolio_id] || 0) + 1
  }
  const topWeekId = Object.entries(weekCounts).sort((a, b) => b[1] - a[1])[0]

  // Conversion rate
  const totalUsers = usersTotal.count ?? 0
  const totalPub = published.count ?? 0
  const convRate = totalUsers > 0 ? ((totalPub / totalUsers) * 100).toFixed(1) : '0'

  // Progress bar
  const progressPct = Math.min(100, Math.round((revMonth / 100 / GOAL) * 100))
  const progressColor = progressPct >= 100 ? '#16a34a' : progressPct >= 30 ? '#0A66C2' : '#dc2626'

  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'

  // Recent signups rows
  const signupRows = (recentSignups.data || []).map((u, i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff'
    const planColor = ['basic', 'pro'].includes(u.plan) ? '#16a34a' : '#6b7280'
    const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '?'
    return `<tr style="background:${bg}">
      <td style="padding:8px 12px;font-size:12px;color:#374151">${u.email}</td>
      <td style="padding:8px 12px;font-size:12px;color:#0A66C2">/${u.slug}</td>
      <td style="padding:8px 12px;font-size:12px;color:${planColor};font-weight:600;text-align:center">${u.plan}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:right">${joined}</td>
    </tr>`
  }).join('')

  // Recent payments rows
  const paymentRows = (recentPayments.data || []).map((p, i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff'
    const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '?'
    return `<tr style="background:${bg}">
      <td style="padding:8px 12px;font-size:13px;color:#16a34a;font-weight:700">${fmtNgn(p.amount_cents || 0)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151">${p.product_tier}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:right">${date}</td>
    </tr>`
  }).join('')

  // Free unpublished rows
  const freeRows = (freeUnpub.data || []).map((u, i) => {
    const bg = i % 2 === 0 ? '#fff7ed' : '#ffffff'
    const days = u.created_at ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000) : '?'
    return `<tr style="background:${bg}">
      <td style="padding:7px 12px;font-size:12px;color:#374151">${u.email}</td>
      <td style="padding:7px 12px;font-size:12px;color:#9a3412;text-align:right">${days}d ago</td>
    </tr>`
  }).join('') || '<tr><td colspan="2" style="padding:7px 12px;color:#9ca3af">None</td></tr>'

  const subject = `📊 Daily Report · ${dateLabel} · ${fmtNgn(revMonth)} this month`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6">
<tr><td align="center" style="padding:24px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- Header -->
  <tr>
    <td style="background:#0A66C2;border-radius:12px 12px 0 0;padding:20px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">
          <div style="color:white;font-weight:700;font-size:16px">liveportfolio.site</div>
          <div style="color:#bfdbfe;font-size:12px">${dateLabel} · ${timestamp}</div>
        </td>
        <td align="right" valign="middle">
          <span style="background:#16a34a;color:white;font-weight:700;font-size:12px;padding:5px 12px;border-radius:12px">Online · Vercel</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Body -->
  <tr><td style="background:white;border-radius:0 0 12px 12px;padding:24px;border:1px solid #e5e7eb;border-top:none">

    <!-- Monthly goal -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px">
      <tr><td style="padding:14px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:13px;font-weight:700;color:#1e40af">Monthly goal — ${GOAL_LABEL}</td>
          <td align="right" style="font-size:13px;font-weight:700;color:${progressColor}">${fmtNgn(revMonth)} / ${GOAL_LABEL} (${progressPct}%)</td>
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background:#dbeafe;border-radius:4px;height:8px">
          <tr><td width="${progressPct}%" style="background:${progressColor};height:8px;border-radius:4px;font-size:0;min-width:4px">&nbsp;</td><td></td></tr>
        </table>
        <div style="margin-top:6px;font-size:11px;color:#6b7280">${payMonthCount} payments this month · ${payCount} all time</div>
      </td></tr>
    </table>

    <!-- Metrics grid -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
      <tr>
        ${cell('Signups', fmt(totalUsers), `+${fmt(usersToday.count)} today · +${fmt(usersLast7.count)} week · +${fmt(usersLast30.count)} month`)}
        <td width="8"></td>
        ${cell('Revenue (NGN)', fmtNgn(revTotal), `${payCount} payments · ${fmtNgn(revMonth)} this month`, '#16a34a')}
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
      <tr>
        ${cell('Published', fmt(totalPub), `${convRate}% conversion · +${fmt(publishedLast7.count)} this week`)}
        <td width="8"></td>
        ${cell('Email list', fmt(subsTotal.count), `+${fmt(subsToday.count)} today · +${fmt(subsLast7.count)} this week`)}
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
      <tr>
        ${cell('Portfolio views', fmt(viewsTotal.count), `across ${portfolioList.length} portfolios`)}
        <td width="8"></td>
        ${cell('Avg health score', `${avgHealth}<span style="font-size:14px;color:#6b7280">/100</span>`, `Minimal: ${tplMinimal} · Bold: ${tplBold}`)}
      </tr>
    </table>

    <!-- Subscriptions -->
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px">Subscriptions</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
      <tr><td style="padding:12px 14px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:12px;color:#374151">
            <strong style="color:#16a34a">${fmt(activeBasic.count)}</strong> Basic active &nbsp;·&nbsp;
            <strong style="color:#16a34a">${fmt(activePro.count)}</strong> Pro active
          </td>
          <td align="right" style="font-size:12px;color:#6b7280">
            <span style="color:#dc2626">${fmt(cancelledMonth.count ?? 0)}</span> cancelled this month &nbsp;·&nbsp;
            <span style="color:#d97706">${fmt(expiringIn30.count)}</span> expiring in 30d
          </td>
        </tr></table>
      </td></tr>
    </table>

    <!-- Free unpublished -->
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px">Free users — not published yet</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;border:1px solid #fed7aa;border-radius:8px">
      <tr style="background:#fff7ed">
        <th style="padding:7px 12px;font-size:10px;color:#9a3412;text-align:left;font-weight:600;text-transform:uppercase">Email</th>
        <th style="padding:7px 12px;font-size:10px;color:#9a3412;text-align:right;font-weight:600;text-transform:uppercase">Signed up</th>
      </tr>
      ${freeRows}
    </table>

    <!-- Recent signups -->
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px">Recent signups</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px">
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase">Email</th>
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase">Slug</th>
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase">Plan</th>
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase">Joined</th>
      </tr>
      ${signupRows || '<tr><td colspan="4" style="padding:8px 12px;color:#9ca3af">No recent signups</td></tr>'}
    </table>

    <!-- Recent payments -->
    <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px">Recent payments</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px">
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase">Amount (NGN)</th>
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase">Plan</th>
        <th style="padding:8px 12px;font-size:10px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase">Date</th>
      </tr>
      ${paymentRows || '<tr><td colspan="3" style="padding:8px 12px;color:#9ca3af">No recent payments</td></tr>'}
    </table>

    <!-- Career scores -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px">
      <tr><td style="padding:12px 14px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Career scores this month</div>
        <div style="font-size:22px;font-weight:800;color:#111827">${fmt(careerScores.count)}</div>
      </td></tr>
    </table>

    <!-- Footer -->
    <div style="padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
      Sent daily at 7:00 AM UTC · Hosted on Vercel ·
      <a href="${APP_URL}" style="color:#0A66C2;text-decoration:none">liveportfolio.site</a>
    </div>

  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  await sendEmail({ to: ALERT_EMAIL, subject, html })

  return NextResponse.json({ ok: true, sent_to: ALERT_EMAIL, timestamp })
}
