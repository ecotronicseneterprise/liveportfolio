import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

// GET /api/account/state — what the onboarding flow needs to decide where a signed-in person belongs.
// Bearer token only; the service role reads the person's own rows (the browser may no longer rely on table access).
// Response: { emailVerified, profile, slug, published, portfolioId }
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: row, error } = await admin.from('users').select('slug, published_at').eq('id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  let portfolioId: string | null = null
  if (row) {
    const { data: p, error: pErr } = await admin.from('portfolios').select('id').eq('user_id', user.id).limit(1).maybeSingle()
    if (pErr) return NextResponse.json({ error: 'server_error' }, { status: 500 })
    portfolioId = p?.id ?? null
  }

  return NextResponse.json(
    { emailVerified: user.emailVerified, profile: !!row, slug: row?.slug ?? null, published: !!row?.published_at, portfolioId },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
