import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { requestRefund, type RefundOutcome } from '@/lib/billing/refund'

export const dynamic = 'force-dynamic'

// POST /api/billing/refund: cancel and refund the signed-in person's latest payment, within 7 days of paying.
// The body is ignored on purpose: the user comes from the verified token, and the payment, amount and reference are all looked up on
// the server. See lib/billing/refund.ts for the rules.
const STATUS: Record<RefundOutcome, number> = {
  refunded: 200,
  pending_manual: 202,
  no_payment: 404,
  already_refunded: 409,
  window_closed: 409,
  not_refundable: 409,
  unavailable: 503,
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getSupabaseAdmin()
  const { outcome } = await requestRefund(admin, user.id)
  if (outcome === 'refunded') {
    try {
      const { data: u } = await admin.from('users').select('slug').eq('id', user.id).maybeSingle()
      const slug = (u as { slug?: string } | null)?.slug
      if (slug) { revalidatePath(`/portfolio/${slug}`); revalidatePath(`/${slug}`) }
    } catch { /* cache refresh only */ }
  }
  return NextResponse.json({ outcome }, { status: STATUS[outcome] })
}
