import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'liveportfolio.site'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const domain = searchParams.get('domain') || ''
  const slug = domain.replace(`.${ROOT_DOMAIN}`, '').toLowerCase()

  // Main domain variants are always valid
  if (!slug || slug === 'www' || slug === ROOT_DOMAIN) {
    return new NextResponse(null, { status: 200 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data } = await supabaseAdmin
    .from('users')
    .select('slug')
    .eq('slug', slug)
    .neq('plan', 'unpublished')
    .single()

  if (data) {
    return new NextResponse(null, { status: 200 })
  }

  return new NextResponse(null, { status: 404 })
}
