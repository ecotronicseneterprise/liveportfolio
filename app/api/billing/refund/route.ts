import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { submitRefundRequest, type RefundOutcome } from '@/lib/billing/refund'

export const dynamic = 'force-dynamic'

// POST /api/billing/refund: ask for a refund of the signed-in person's latest payment, within 7 days of paying. This does not move money:
// it e-mails the owner (see submitRefundRequest), who refunds by hand in Paystack.
// The body is ignored on purpose: the user comes from the verified token, and the payment, amount and reference are all looked up on
// the server. See lib/billing/refund.ts for the rules.
const STATUS: Record<RefundOutcome, number> = {
  requested: 202,
  already_requested: 409,
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
  const { outcome } = await submitRefundRequest(admin, user.id)
  return NextResponse.json({ outcome }, { status: STATUS[outcome] })
}
