import { NextResponse } from 'next/server'
import { checkoutMode } from '@/lib/billing/flag'

export const dynamic = 'force-dynamic'

// GET /api/checkout/config: lets the upgrade modal show the billing wording that matches the checkout that is live. Reveals only
// whether the one-time checkout is on for everyone (never the owner-only state, never any secret).
export async function GET() {
  return NextResponse.json({ oneTime: checkoutMode() === 'on' })
}
