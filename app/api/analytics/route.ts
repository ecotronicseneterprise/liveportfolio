import { NextRequest, NextResponse } from 'next/server'

// FIX 3: view_count is no longer the source of truth for analytics.
// analytics_events (written server-side on page render) is the single source of truth.
// This route is kept alive so existing client-side calls don't error, but it no-ops.
// portfolios.view_count is still updated by the server-side page render path via
// last_viewed_at — the column is preserved for the admin metrics and drip emails
// which have not been migrated yet (see app/api/admin/metrics/route.ts and
// app/api/cron/drip/route.ts).

export async function POST(req: NextRequest) {
  try {
    // Consume the request body so the connection closes cleanly
    await req.json().catch(() => {})
    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
