import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { checkSlugShape } from '@/lib/slug'
import { slugSuggestions } from '@/lib/onboarding/slugify'
import { allow } from '@/lib/connectors/limits'

export const dynamic = 'force-dynamic'

// POST /api/account/slug { slug } — change the address, ONLY while the portfolio has never been published.
//
// The gate is `users.published_at IS NULL`, not `plan = 'unpublished'`: the expiry cron resets lapsed customers to
// 'unpublished', and a former customer must not be able to move an address people already link to.
// The check is part of the UPDATE itself (`.is('published_at', null)`), so there is no check-then-write race.
// The users row is created by POST /api/account/profile; this route never creates one (409 profile_required).
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!allow(`slug:${user.id}`, 10, 60_000)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let body: { slug?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const shape = checkSlugShape(body.slug)
  if (!shape.ok) return NextResponse.json({ error: shape.error, message: shape.message }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: row, error: rowErr } = await admin.from('users').select('slug, published_at').eq('id', user.id).maybeSingle()
  if (rowErr) return NextResponse.json({ error: 'server_error' }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'profile_required' }, { status: 409 })
  if (row.published_at) return NextResponse.json({ error: 'slug_locked', message: 'Your address is fixed once you have published.' }, { status: 403 })
  const oldSlug = row.slug as string | null
  if (oldSlug === shape.slug) return NextResponse.json({ slug: oldSlug, changed: false })

  const { data: taken } = await admin.from('users').select('id').eq('slug', shape.slug).maybeSingle()
  if (taken) {
    return NextResponse.json({ error: 'slug_taken', message: 'That address is taken.', suggestions: slugSuggestions(shape.slug) }, { status: 409 })
  }

  const { data: updated, error: upErr } = await admin
    .from('users')
    .update({ slug: shape.slug })
    .eq('id', user.id)
    .is('published_at', null)
    .select('slug')
  if (upErr) {
    if ((upErr as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'slug_taken', message: 'That address is taken.', suggestions: slugSuggestions(shape.slug) }, { status: 409 })
    }
    console.error('[account/slug] update failed', (upErr as { code?: string }).code)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    // published between the read and the write
    return NextResponse.json({ error: 'slug_locked', message: 'Your address is fixed once you have published.' }, { status: 403 })
  }

  for (const s of [oldSlug, shape.slug]) {
    if (s) { revalidatePath(`/portfolio/${s}`); revalidatePath(`/${s}`) }
  }
  return NextResponse.json({ slug: shape.slug, changed: true })
}
