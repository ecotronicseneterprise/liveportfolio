import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { getUserPlan } from '@/lib/getUserPlan'

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

  return NextResponse.json({
    plan,
    expires_at: expiresAt,
    days_left: daysLeft,
    one_time: rows.length > 0 ? rows[0].ls_order_id.startsWith('lpi_') : null,
    payments: rows.map((p) => ({ date: p.created_at, plan: p.product_tier, amount_kobo: p.amount_cents, refunded: !!p.refunded_at })),
  })
}
