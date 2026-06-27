import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// ── Partner config — add new partners here only ─────────────────────────────
const PARTNERS: Record<string, {
  name: string
  email: string
  commission: number // decimal, e.g. 0.30 = 30%
}> = {
  'esther': {
    name: 'Esther Anagu',
    email: 'anaguesther2@gmail.com',
    commission: 0.30,
  },
  'clifford': {
    name: 'Clifford Nwanna',
    email: 'nwannachumaclifford@gmail.com',
    commission: 0,
  },
  'pelumi': {
    name: 'Pelumi',
    email: 'adekunmipelumi@yahoo.com',
    commission: 0.30,
  },
  'temitope': {
    name: 'Temitope',
    email: '',
    commission: 0.30,
  },
}

const ADMIN_EMAIL = 'nwannachumaclifford@gmail.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

// ── Email helpers ────────────────────────────────────────────────────────────
function naira(cents: number): string {
  return '₦' + (cents / 100).toLocaleString('en-NG')
}

function tableRow(label: string, value: string, highlight = false): string {
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#6B7280">${label}</td>
      <td style="padding:8px 0;font-size:${highlight ? '15' : '14'}px;
        font-weight:${highlight ? '700' : '700'};color:${highlight ? '#0A66C2' : '#0A0A0A'};
        text-align:right">${value}</td>
    </tr>`
}

function dividerRow(): string {
  return `<tr><td colspan="2" style="border-top:1px solid #E5E7EB;padding:0"></td></tr>`
}

function partnerEmailHtml(
  partnerKey: string,
  weekEnding: string,
  weekSignups: number,
  weekPayingUsers: number,
  weekCommissionCents: number,
  lifetimeSignups: number,
  lifetimeCommissionCents: number,
): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0A0A0A">
      <h2 style="margin:0 0 4px">Your affiliate report</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px">Week ending ${weekEnding}</p>

      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          ${tableRow('New signups this week', String(weekSignups))}
          ${tableRow('Paying users this week', String(weekPayingUsers))}
          ${dividerRow()}
          ${tableRow('Commission this week', naira(weekCommissionCents), true)}
          ${tableRow('Total earned (lifetime)', naira(lifetimeCommissionCents), true)}
          ${tableRow('Total signups (lifetime)', String(lifetimeSignups))}
        </table>
      </div>

      <p style="font-size:13px;color:#6B7280;margin-bottom:8px">
        Commissions are paid monthly via bank transfer.
        Reply to this email with your account details if you haven't already.
      </p>
      <p style="font-size:13px;color:#6B7280">
        Your referral link:
        <a href="${APP_URL}/create?ref=${partnerKey}" style="color:#0A66C2">
          liveportfolio.site/create?ref=${partnerKey}
        </a>
      </p>
    </div>
  `
}

function adminEmailHtml(
  weekEnding: string,
  partnerRows: { name: string; signups: number; commissionCents: number }[],
  organicSignups: number,
  totalCommissionCents: number,
): string {
  const partnerTableRows = partnerRows.map((p) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#0A0A0A">${p.name}</td>
      <td style="padding:8px 0;font-size:14px;text-align:right">${p.signups}</td>
      <td style="padding:8px 0;font-size:14px;color:#0A66C2;font-weight:700;text-align:right">${naira(p.commissionCents)}</td>
    </tr>`).join('')

  const totalReferralSignups = partnerRows.reduce((s, p) => s + p.signups, 0)

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0A0A0A">
      <h2 style="margin:0 0 4px">Affiliate summary</h2>
      <p style="color:#6B7280;margin:0 0 24px;font-size:14px">Week ending ${weekEnding}</p>

      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;font-size:12px;color:#9CA3AF;font-weight:600;padding-bottom:8px">Partner</th>
              <th style="text-align:right;font-size:12px;color:#9CA3AF;font-weight:600;padding-bottom:8px">Signups</th>
              <th style="text-align:right;font-size:12px;color:#9CA3AF;font-weight:600;padding-bottom:8px">Commission owed</th>
            </tr>
          </thead>
          <tbody>
            ${partnerTableRows}
            <tr style="border-top:2px solid #E5E7EB">
              <td style="padding:10px 0;font-weight:700">Total</td>
              <td style="padding:10px 0;font-weight:700;text-align:right">${totalReferralSignups}</td>
              <td style="padding:10px 0;font-weight:700;color:#0A66C2;text-align:right">${naira(totalCommissionCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="font-size:13px;color:#6B7280;margin:0">
        Organic signups this week: <strong>${organicSignups}</strong>
      </p>
    </div>
  `
}

// ── Cron handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET || ''
  const fromHeader = req.headers.get('x-cron-secret') || ''
  const fromBearer = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const provided = fromHeader || fromBearer
  let match = false
  try {
    const safe = (s: string) => Buffer.from(s.padEnd(expected.length || 1))
    match = provided.length > 0 &&
      provided.length === expected.length &&
      timingSafeEqual(safe(provided), safe(expected))
  } catch {
    match = false
  }
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const adminOnly = searchParams.get('admin_only') === 'true'

  const supabaseAdmin = getSupabaseAdmin()
  const weekEnding = new Date().toDateString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const log: string[] = []

  // Per-partner stats for admin summary
  const adminPartnerRows: { name: string; signups: number; commissionCents: number }[] = []
  let totalCommissionCents = 0

  for (const partnerKey of Object.keys(PARTNERS)) {
    const partner = PARTNERS[partnerKey]

    // All referred user IDs (used for both week and lifetime payment queries)
    const { data: allReferredUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_partner', partnerKey)

    const referredIds = (allReferredUsers || []).map((u: { id: string }) => u.id)

    // ── Week stats ───────────────────────────────────────────────────────────

    const { count: weekSignups } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_partner', partnerKey)
      .gte('created_at', sevenDaysAgo)

    let weekPayingUsers = 0
    let weekRevenueCents = 0
    if (referredIds.length > 0) {
      const { data: weekPayments } = await supabaseAdmin
        .from('payments')
        .select('amount_cents, user_id')
        .in('user_id', referredIds)
        .gte('created_at', sevenDaysAgo)
      weekRevenueCents = (weekPayments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)
      weekPayingUsers = new Set((weekPayments || []).map((p) => p.user_id)).size
    }

    const weekCommissionCents = Math.round(weekRevenueCents * partner.commission)

    // ── Lifetime stats ───────────────────────────────────────────────────────

    const { count: lifetimeSignups } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_partner', partnerKey)

    let lifetimeRevenueCents = 0
    if (referredIds.length > 0) {
      const { data: lifetimePayments } = await supabaseAdmin
        .from('payments')
        .select('amount_cents')
        .in('user_id', referredIds)
      lifetimeRevenueCents = (lifetimePayments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)
    }

    const lifetimeCommissionCents = Math.round(lifetimeRevenueCents * partner.commission)

    // ── Send partner email ───────────────────────────────────────────────────
    if (!adminOnly) {
      try {
        await sendEmail({
          to: partner.email,
          subject: `Your LivePortfolio affiliate report — ${weekEnding}`,
          html: partnerEmailHtml(
            partnerKey,
            weekEnding,
            weekSignups ?? 0,
            weekPayingUsers,
            weekCommissionCents,
            lifetimeSignups ?? 0,
            lifetimeCommissionCents,
          ),
        })
        log.push(`partner_report → ${partner.email} (${partnerKey})`)
      } catch (err) {
        log.push(`partner_report FAILED → ${partner.email}: ${err}`)
      }
    } else {
      log.push(`partner_report SKIPPED (admin_only) → ${partner.email} (${partnerKey})`)
    }

    // Accumulate for admin summary
    adminPartnerRows.push({
      name: partner.name,
      signups: weekSignups ?? 0,
      commissionCents: weekCommissionCents,
    })
    totalCommissionCents += weekCommissionCents
  }

  // ── Organic signups (no referral) ────────────────────────────────────────
  const { count: organicSignups } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .is('referral_partner', null)
    .gte('created_at', sevenDaysAgo)

  // ── Send admin summary ───────────────────────────────────────────────────
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Affiliate summary — ${weekEnding}`,
      html: adminEmailHtml(
        weekEnding,
        adminPartnerRows,
        organicSignups ?? 0,
        totalCommissionCents,
      ),
    })
    log.push(`admin_summary → ${ADMIN_EMAIL}`)
  } catch (err) {
    log.push(`admin_summary FAILED → ${ADMIN_EMAIL}: ${err}`)
  }

  console.log('[cron/affiliate]', log)
  return NextResponse.json({
    ok: true,
    partners: Object.keys(PARTNERS).length,
    weekEnding,
    log,
  })
}

// VPS crontab line to add (run every Monday at 07:30 UTC):
// 30 7 * * 1 curl -s -H "x-cron-secret: $CRON_SECRET" https://liveportfolio.site/api/cron/affiliate
