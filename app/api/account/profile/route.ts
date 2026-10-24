import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase'
import { checkSlugShape } from '@/lib/slug'
import { normalizeReferral } from '@/lib/partners'

export const dynamic = 'force-dynamic'

// POST /api/account/profile — creates the signed-in user's `users` row at signup.
//
// This replaces a browser-side `supabase.from('users').insert(...)`. The browser can no longer write `users`
// (see supabase/migrations/*_close_browser_writes.sql), so every column is decided HERE:
//   id, email  → from the verified token, never from the request body
//   plan       → always 'unpublished' (paid plans are set only by the Paystack webhook / invite / bootcamp routes)
//   slug       → validated (format, reserved words, uniqueness)
//   referral   → accepted only if it is a known partner key
// The body is { slug, referral_code? }; any other field (plan, published_at, custom_domain, …) is ignored.

// Best-effort in-process limiter (resets on restart). The real guards are the verified token and the unique slug.
const hits = new Map<string, { n: number; resetAt: number }>()
function limited(key: string): boolean {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || now > h.resetAt) {
    if (hits.size > 5000) hits.clear()
    hits.set(key, { n: 1, resetAt: now + 60_000 })
    return false
  }
  h.n++
  return h.n > 5
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authError } = await getSupabaseClient().auth.getUser(token)
  const user = authData?.user
  if (authError || !user || !user.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (limited(user.id)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let body: { slug?: unknown; referral_code?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Idempotent: a retry after a network blip, or a second tab, gets the existing row back.
  const { data: existing } = await supabaseAdmin.from('users').select('id, slug').eq('id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ slug: existing.slug, created: false })

  const shape = checkSlugShape(body.slug)
  if (!shape.ok) return NextResponse.json({ error: shape.error, message: shape.message }, { status: 400 })

  const { data: taken } = await supabaseAdmin.from('users').select('id').eq('slug', shape.slug).maybeSingle()
  if (taken) return NextResponse.json({ error: 'slug_taken', message: 'That username is already taken.' }, { status: 409 })

  const referral = normalizeReferral(body.referral_code)

  const { error: insertError } = await supabaseAdmin.from('users').insert({
    id: user.id,
    email: user.email.toLowerCase(),
    slug: shape.slug,
    plan: 'unpublished',
    ...(referral ? { referral_partner: referral } : {}),
  })

  if (insertError) {
    // 23505 = unique_violation: either the slug (lost a race) or the e-mail already belongs to another account.
    if ((insertError as { code?: string }).code === '23505') {
      const dupSlug = /slug/i.test(insertError.message || '')
      return NextResponse.json(
        { error: dupSlug ? 'slug_taken' : 'email_in_use', message: dupSlug ? 'That username is already taken.' : 'That e-mail already has an account.' },
        { status: 409 }
      )
    }
    console.error('[account/profile] insert failed', (insertError as { code?: string }).code)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ slug: shape.slug, created: true, referral_applied: !!referral }, { status: 201 })
}
