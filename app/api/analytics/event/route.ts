import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// In-memory dedup: ip_hash+portfolio_id+event_type+label → last seen ms
const seen = new Map<string, number>()
const DEDUP_MS = 60 * 1000 // 1-minute dedup per unique event

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { portfolio_id, event_type, label, referrer } = body

    if (!portfolio_id || typeof portfolio_id !== 'string') {
      return NextResponse.json({}, { status: 200 })
    }
    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({}, { status: 200 })
    }

    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = createHash('sha256').update(rawIp).digest('hex').slice(0, 16)

    const dedupKey = `${ipHash}:${portfolio_id}:${event_type}:${label || ''}`
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
    await supabaseAdmin.from('analytics_events').insert({
      portfolio_id,
      event_type,
      label: label || null,
      referrer: referrer || null,
      ip_hash: ipHash,
    })

    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
