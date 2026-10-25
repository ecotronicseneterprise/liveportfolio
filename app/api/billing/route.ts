import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { getUserPlan } from '@/lib/getUserPlan'
import { refundableNow } from '@/lib/billing/refund'
import { daysLeft as cohortDaysLeft } from '@/lib/cohort/schedule'

export const dynamic = 'force-dynamic'

// GET /api/billing: the signed-in person's own plan, end date and last payments, for the dashboard's "Plan and billing" panel.
// Everything is read by the verified user id only; payment references are never returned (only whether the latest payment was made
// through the one-time checkout, which decides whether the panel says "no automatic renewal").
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getSupabaseAdmin()

  const plan = await getUserPlan(user.id)

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('user_id', user.id)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: pays, error: payErr } = await admin
    .from('payments')
    .select('created_at, product_tier, amount_cents, refunded_at, ls_order_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  if (payErr) return NextResponse.json({ error: 'billing_unavailable' }, { status: 500 })

  const rows = (pays ?? []) as Array<{ created_at: string; product_tier: string; amount_cents: number; refunded_at: string | null; ls_order_id: string }>
  const s = sub as { plan?: string; status?: string; expires_at?: string } | null
  const expiresAt = s?.expires_at ?? null
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)) : null

  // What the panel may offer, decided here from server time. The refund endpoint re-checks everything itself.
  let refund: Awaited<ReturnType<typeof refundableNow>> | null = null
  try { refund = await refundableNow(admin, user.id) } catch { refund = null }

  // Free cohort access (bootcamp / university link): the countdown the dashboard shows. Left out once the person has a paid plan running.
  let cohort: { name: string; ends_at: string; days_left: number; active: boolean } | undefined
  try {
    const { data: cu } = await admin.from('users').select('bootcamp_code, plan_expires_at').eq('id', user.id).maybeSingle()
    const c = cu as { bootcamp_code?: string | null; plan_expires_at?: string | null } | null
    const paidRunning = !!expiresAt && new Date(expiresAt).getTime() > Date.now()
    if (c?.bootcamp_code && c.plan_expires_at && !paidRunning) {
      const { data: bc } = await admin.from('bootcamp_codes').select('name').eq('code', c.bootcamp_code).maybeSingle()
      const left = cohortDaysLeft(c.plan_expires_at)
      cohort = { name: (bc as { name?: string } | null)?.name || 'your programme', ends_at: c.plan_expires_at, days_left: left, active: left > 0 }
    }
  } catch { cohort = undefined }

  return NextResponse.json({
    plan,
    expires_at: expiresAt,
    days_left: daysLeft,
    one_time: rows.length > 0 ? rows[0].ls_order_id.startsWith('lpi_') : null,
    refund: refund?.paid_at ? { requested: refund.requested, eligible: refund.eligible, deadline: refund.deadline, tier: refund.tier, amount_kobo: refund.amount_kobo, one_time: refund.reference_kind === 'one_time' } : undefined, // keys are left out when there is nothing to say
    cohort,
    payments: rows.map((p) => ({ date: p.created_at, plan: p.product_tier, amount_kobo: p.amount_cents, refunded: !!p.refunded_at })),
  })
}
