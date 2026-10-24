import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkSlugShape, normalizeSlug } from '@/lib/slug'

// In-memory rate limiting: 10 per IP per minute
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}

export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const slug = normalizeSlug(searchParams.get('slug'))

  if (!slug) {
    return NextResponse.json({ available: false, error: 'Slug required' })
  }

  const shape = checkSlugShape(slug)
  if (!shape.ok) {
    return NextResponse.json(
      shape.error === 'reserved_slug'
        ? { available: false, suggestion: `${slug}-dev` }
        : { available: false, error: shape.message }
    )
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (data) {
    // Slug taken — generate suggestions
    const suggestions = [
      `${slug}-1`,
      `${slug}-dev`,
      `${slug}-io`,
    ]
    return NextResponse.json({ available: false, suggestion: suggestions[0] })
  }

  return NextResponse.json({ available: true })
}
