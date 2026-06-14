import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// FIX 8: Allowed event types
const ALLOWED_EVENT_TYPES = new Set(['portfolio_view', 'click'])

// FIX 8: IP rate limit — 20 events per IP per minute
const ipCounts = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 20) return true
  entry.count++
  return false
}

// In-memory dedup: ip_hash+portfolio_id+event_type+label → last seen ms
const seen = new Map<string, number>()
const DEDUP_MS = 60 * 1000 // 1-minute dedup per unique event

export async function POST(req: NextRequest) {
  try {
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(rawIp)) {
      return NextResponse.json({}, { status: 200 })
    }

    const body = await req.json()
    const { portfolio_id, event_type, label, referrer } = body

    if (!portfolio_id || typeof portfolio_id !== 'string') {
      return NextResponse.json({}, { status: 200 })
    }

    // FIX 8: Allowlist event_type
    if (!event_type || !ALLOWED_EVENT_TYPES.has(event_type)) {
      return NextResponse.json({}, { status: 200 })
    }

    // FIX 8: Cap label length
    const safeLabel = typeof label === 'string' ? label.slice(0, 100) : null

    const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16)

    const dedupKey = `${ipHash}:${portfolio_id}:${event_type}:${safeLabel || ''}`
    const now = Date.now()
    const last = seen.get(dedupKey)
    if (last && now - last < DEDUP_MS) {
      return NextResponse.json({}, { status: 200 })
    }
    seen.set(dedupKey, now)

    if (seen.size > 50000) {
      for (const [k, t] of seen.entries()) {
        if (now - t > DEDUP_MS * 10) seen.delete(k)
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // FIX 8: Confirm portfolio_id exists before inserting
    const { data: portfolioExists } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolio_id)
      .single()
    if (!portfolioExists) {
      return NextResponse.json({}, { status: 200 })
    }

    await supabaseAdmin.from('analytics_events').insert({
      portfolio_id,
      event_type,
      label: safeLabel,
      referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
      ip_hash: ipHash,
    })

    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
