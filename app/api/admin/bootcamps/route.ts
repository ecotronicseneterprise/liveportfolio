import { NextRequest, NextResponse } from 'next/server'
import { adminAuthorised } from '@/lib/admin/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
const CODE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/

const authorised = adminAuthorised // the owner signed in, or the operations secret

// GET: every cohort link with how many people have used it.
export async function GET(req: NextRequest) {
  if (!(await authorised(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: codes, error } = await supabase
    .from('bootcamp_codes')
    .select('name, code, use_count, plan_to_grant, active, max_uses, created_at')
    .order('use_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    bootcamps: (codes ?? []).map((c) => ({ ...c, link: `${APP_URL}/bootcamp/${c.code}` })),
  })
}

// POST { code, name, plan_to_grant?: 'basic' | 'pro', max_uses?: number }: creates a cohort link (no SQL needed).
// The link is /bootcamp/<code>. Everyone who signs up through it gets 6 months of that plan.
export async function POST(req: NextRequest) {
  if (!(await authorised(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { code?: unknown; name?: unknown; plan_to_grant?: unknown; max_uses?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : ''
  if (!CODE_RE.test(code)) return NextResponse.json({ error: 'invalid_code', message: 'Use 2 to 40 lowercase letters, numbers or hyphens.' }, { status: 400 })
  const name = typeof body.name === 'string' ? body.name.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : ''
  if (name.length < 2) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  const plan = body.plan_to_grant === 'pro' ? 'pro' : 'basic'
  let maxUses: number | null = null
  if (body.max_uses !== undefined && body.max_uses !== null) {
    const n = Number(body.max_uses)
    if (!Number.isInteger(n) || n < 1 || n > 100000) return NextResponse.json({ error: 'invalid_max_uses' }, { status: 400 })
    maxUses = n
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('bootcamp_codes')
    .insert({ code, name, plan_to_grant: plan, active: true, max_uses: maxUses, use_count: 0 })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'code_exists' }, { status: 409 })
    console.error('[admin/bootcamps create]', error.message)
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, code, name, plan_to_grant: plan, max_uses: maxUses, link: `${APP_URL}/bootcamp/${code}` })
}

// PATCH { code, active?: boolean, max_uses?: number | null }: switch a link off (or on again), or change its limit. People who already
// used it keep their 6 months.
export async function PATCH(req: NextRequest) {
  if (!(await authorised(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { code?: unknown; active?: unknown; max_uses?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : ''
  if (!CODE_RE.test(code)) return NextResponse.json({ error: 'invalid_code' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.active === 'boolean') patch.active = body.active
  if (body.max_uses === null) patch.max_uses = null
  else if (body.max_uses !== undefined) {
    const n = Number(body.max_uses)
    if (!Number.isInteger(n) || n < 1 || n > 100000) return NextResponse.json({ error: 'invalid_max_uses' }, { status: 400 })
    patch.max_uses = n
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing_to_change' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('bootcamp_codes').update(patch).eq('code', code).select('code, name, active, max_uses, use_count')
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, bootcamp: data[0] })
}
