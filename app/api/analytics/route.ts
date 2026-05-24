import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// In-memory deduplication: IP+slug → timestamp
const seen = new Map<string, number>()
const HOUR_MS = 60 * 60 * 1000

// Batch buffer: slug → increment count
const batch = new Map<string, number>()

// Flush batch to Supabase every 5 minutes
let flushTimer: ReturnType<typeof setInterval> | null = null

function startFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(async () => {
    if (batch.size === 0) return
    const entries = Array.from(batch.entries())
    batch.clear()

    for (const [slug, count] of entries) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, portfolios(id, view_count)')
        .eq('slug', slug)
        .single()

      if (!user) continue
      const portfolio = (user.portfolios as unknown as { id: string; view_count: number }[])?.[0]
      if (!portfolio) continue

      await supabaseAdmin
        .from('portfolios')
        .update({
          view_count: (portfolio.view_count || 0) + count,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', portfolio.id)
    }
  }, 5 * 60 * 1000)
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json()
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({}, { status: 200 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const key = `${ip}:${slug}`
    const now = Date.now()

    // 1-per-hour deduplication per IP+slug
    const last = seen.get(key)
    if (last && now - last < HOUR_MS) {
      return NextResponse.json({}, { status: 200 })
    }

    seen.set(key, now)

    // Clean stale entries every N calls
    if (seen.size > 10000) {
      for (const [k, t] of seen.entries()) {
        if (now - t > HOUR_MS) seen.delete(k)
      }
    }

    // Buffer the increment
    batch.set(slug, (batch.get(slug) || 0) + 1)
    startFlushTimer()

    return NextResponse.json({}, { status: 200 })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
