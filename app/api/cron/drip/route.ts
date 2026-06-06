import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  sendFlowA,
  sendFlowB,
  sendWeeklyScore,
  sendMonthlyViews,
  sendRenewalReminder,
} from '@/lib/email-drip'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

// Helper: days elapsed since a given ISO timestamp
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// Helper: mark a flow+day combo as sent in sent_flows JSONB
async function markSent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  key: string,
): Promise<void> {
  // Read current sent_flows, merge, write back
  const { data } = await supabaseAdmin
    .from('email_subscribers')
    .select('sent_flows')
    .eq('email', email)
    .single()

  const current: Record<string, boolean> = (data?.sent_flows as Record<string, boolean>) || {}
  current[key] = true

  await supabaseAdmin
    .from('email_subscribers')
    .update({ sent_flows: current })
    .eq('email', email)
}

async function hasSent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  key: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('email_subscribers')
    .select('sent_flows')
    .eq('email', email)
    .single()

  const flows = (data?.sent_flows as Record<string, boolean>) || {}
  return flows[key] === true
}

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date()
  const isMonday = now.getUTCDay() === 1
  const isFirstOfMonth = now.getUTCDate() === 1
  const log: string[] = []

  // ── Flow A: Free users who haven't published ─────────────────────────────
  const { data: freeSubscribers } = await supabaseAdmin
    .from('email_subscribers')
    .select('email, user_id, created_at, sent_flows')
    .eq('subscribed', true)

  for (const sub of freeSubscribers || []) {
    if (!sub.user_id) continue

    // Check if user is still on free plan (not published)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan, slug')
      .eq('id', sub.user_id)
      .single()

    if (!userData || userData.plan !== 'unpublished') continue

    // Also check subscriptions table — they may have a subscription but plan not updated yet
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (activeSub) continue // already a paying user

    const days = daysSince(sub.created_at)
    const portfolioUrl = `${APP_URL}/${userData.slug}`

    const flowADays: Array<1 | 3 | 6 | 12> = [1, 3, 6, 12]
    for (const d of flowADays) {
      if (days >= d) {
        const key = `a_${d}`
        if (!(await hasSent(supabaseAdmin, sub.email, key))) {
          try {
            await sendFlowA(d, sub.email, portfolioUrl)
            await markSent(supabaseAdmin, sub.email, key)
            // Increment sequence_step
            await supabaseAdmin
              .from('email_subscribers')
              .update({ sequence_step: d })
              .eq('email', sub.email)
            log.push(`flow_a day${d} → ${sub.email}`)
          } catch (err) {
            log.push(`flow_a day${d} FAILED → ${sub.email}: ${err}`)
          }
          break // send only the highest eligible step not yet sent
        }
      }
    }
  }

  // ── Flow B: Basic users → upgrade to Pro ─────────────────────────────────
  const { data: basicSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, started_at, plan')
    .eq('plan', 'basic')
    .eq('status', 'active')

  for (const sub of basicSubs || []) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', sub.user_id)
      .single()

    if (!userData?.email) continue

    // Ensure subscriber row exists for sent_flows tracking
    await supabaseAdmin
      .from('email_subscribers')
      .upsert({ email: userData.email, user_id: sub.user_id, subscribed: true }, { onConflict: 'email', ignoreDuplicates: true })

    const days = daysSince(sub.started_at)
    const flowBDays: Array<7 | 21 | 45> = [7, 21, 45]

    for (const d of flowBDays) {
      if (days >= d) {
        const key = `b_${d}`
        if (!(await hasSent(supabaseAdmin, userData.email, key))) {
          try {
            await sendFlowB(d, userData.email)
            await markSent(supabaseAdmin, userData.email, key)
            log.push(`flow_b day${d} → ${userData.email}`)
          } catch (err) {
            log.push(`flow_b day${d} FAILED → ${userData.email}: ${err}`)
          }
          break
        }
      }
    }
  }

  // ── Flow C: Weekly score email (Pro only, Mondays) ────────────────────────
  if (isMonday) {
    const { data: proSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('plan', 'pro')
      .eq('status', 'active')

    for (const sub of proSubs || []) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', sub.user_id)
        .single()

      if (!userData?.email) continue

      // Get latest portfolio for this user
      const { data: portfolio } = await supabaseAdmin
        .from('portfolios')
        .select('id')
        .eq('user_id', sub.user_id)
        .single()

      if (!portfolio) continue

      // Get latest career score
      const { data: scoreRow } = await supabaseAdmin
        .from('career_scores')
        .select('score, summary')
        .eq('portfolio_id', portfolio.id)
        .order('scored_at', { ascending: false })
        .limit(1)
        .single()

      if (!scoreRow) continue

      // Dedup key: week number to prevent double-send
      const weekKey = `c_score_${now.getUTCFullYear()}_w${Math.ceil(now.getUTCDate() / 7)}_${now.getUTCMonth()}`

      await supabaseAdmin
        .from('email_subscribers')
        .upsert({ email: userData.email, user_id: sub.user_id, subscribed: true }, { onConflict: 'email', ignoreDuplicates: true })

      if (!(await hasSent(supabaseAdmin, userData.email, weekKey))) {
        try {
          await sendWeeklyScore(userData.email, scoreRow.score, scoreRow.summary || '')
          await markSent(supabaseAdmin, userData.email, weekKey)
          log.push(`flow_c weekly_score → ${userData.email} (${scoreRow.score}/100)`)
        } catch (err) {
          log.push(`flow_c weekly_score FAILED → ${userData.email}: ${err}`)
        }
      }
    }
  }

  // ── Flow C: Monthly views summary (Basic + Pro, 1st of month) ────────────
  if (isFirstOfMonth) {
    const { data: allActiveSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan')
      .eq('status', 'active')
      .in('plan', ['basic', 'pro'])

    const monthKey = `c_monthly_${now.getUTCFullYear()}_${now.getUTCMonth()}`

    for (const sub of allActiveSubs || []) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', sub.user_id)
        .single()

      if (!userData?.email) continue

      const { data: portfolio } = await supabaseAdmin
        .from('portfolios')
        .select('id, view_count')
        .eq('user_id', sub.user_id)
        .single()

      if (!portfolio) continue

      // Get top referrer for last 30 days from analytics_events
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: events } = await supabaseAdmin
        .from('analytics_events')
        .select('referrer')
        .eq('portfolio_id', portfolio.id)
        .gte('created_at', thirtyDaysAgo)

      const referrerCounts: Record<string, number> = {}
      for (const e of events || []) {
        const ref = e.referrer
        let source = 'Direct'
        if (ref) {
          if (ref.includes('linkedin')) source = 'LinkedIn'
          else if (ref.includes('wa.me') || ref.includes('whatsapp')) source = 'WhatsApp'
          else if (ref.includes('twitter') || ref.includes('x.com')) source = 'Twitter/X'
          else if (ref.includes('github')) source = 'GitHub'
          else source = 'Other'
        }
        referrerCounts[source] = (referrerCounts[source] || 0) + 1
      }
      const topSource = Object.entries(referrerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Direct'

      await supabaseAdmin
        .from('email_subscribers')
        .upsert({ email: userData.email, user_id: sub.user_id, subscribed: true }, { onConflict: 'email', ignoreDuplicates: true })

      if (!(await hasSent(supabaseAdmin, userData.email, monthKey))) {
        try {
          await sendMonthlyViews(userData.email, portfolio.view_count || 0, topSource)
          await markSent(supabaseAdmin, userData.email, monthKey)
          log.push(`flow_c monthly_views → ${userData.email} (${portfolio.view_count} views)`)
        } catch (err) {
          log.push(`flow_c monthly_views FAILED → ${userData.email}: ${err}`)
        }
      }
    }
  }

  // ── Flow C: Renewal reminder (30 days before expires_at) ─────────────────
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: expiringSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, expires_at')
    .eq('status', 'active')
    .in('plan', ['basic', 'pro'])
    .lte('expires_at', thirtyDaysFromNow)
    .gte('expires_at', now.toISOString())

  for (const sub of expiringSubs || []) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', sub.user_id)
      .single()

    if (!userData?.email) continue

    const renewalKey = `c_renewal_${sub.expires_at?.slice(0, 7)}` // YYYY-MM dedup

    await supabaseAdmin
      .from('email_subscribers')
      .upsert({ email: userData.email, user_id: sub.user_id, subscribed: true }, { onConflict: 'email', ignoreDuplicates: true })

    if (!(await hasSent(supabaseAdmin, userData.email, renewalKey))) {
      try {
        await sendRenewalReminder(userData.email, sub.plan as 'basic' | 'pro', sub.expires_at)
        await markSent(supabaseAdmin, userData.email, renewalKey)
        log.push(`flow_c renewal → ${userData.email}`)
      } catch (err) {
        log.push(`flow_c renewal FAILED → ${userData.email}: ${err}`)
      }
    }
  }

  console.log('[cron/drip]', log)
  return NextResponse.json({ ok: true, sent: log.length, log })
}
