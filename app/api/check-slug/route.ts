import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkSlugShape, normalizeSlug } from '@/lib/slug'
import { slugSuggestions } from '@/lib/onboarding/slugify'

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

  // Response contract (additive; the old wizard still reads `available` and `suggestion`):
  //   { available, reason: null | 'invalid' | 'reserved' | 'taken', message?, suggestions[], suggestion? }
  // The UI must show "taken" ONLY for reason === 'taken'.
  if (!slug) {
    return NextResponse.json({ available: false, reason: 'invalid', error: 'Slug required', message: 'Enter an address.', suggestions: [] })
  }

  const shape = checkSlugShape(slug)
  if (!shape.ok) {
    if (shape.error === 'reserved_slug') {
      const suggestions = slugSuggestions(slug)
      return NextResponse.json({ available: false, reason: 'reserved', message: shape.message, suggestion: suggestions[0] ?? `${slug}-dev`, suggestions })
    }
    return NextResponse.json({ available: false, reason: 'invalid', error: shape.message, message: shape.message, suggestions: [] })
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (data) {
    // Slug taken — offer alternatives that are valid in shape and not taken themselves
    const candidates = slugSuggestions(slug, new Set(), 6)
    const { data: used } = await supabaseAdmin.from('users').select('slug').in('slug', candidates)
    const usedSet = new Set((used ?? []).map((r: { slug: string }) => r.slug))
    const suggestions = candidates.filter((c) => !usedSet.has(c)).slice(0, 3)
    return NextResponse.json({
      available: false,
      reason: 'taken',
      message: 'That address is taken.',
      suggestion: suggestions[0] ?? `${slug}-1`,
      suggestions,
    })
  }

  return NextResponse.json({ available: true, reason: null, suggestions: [] })
}
