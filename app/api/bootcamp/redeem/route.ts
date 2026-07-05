import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const supabaseAdmin = getSupabaseAdmin()

  const { data: bootcamp, error: fetchError } = await supabaseAdmin
    .from('bootcamp_codes')
    .select('code, name, plan_to_grant, active, max_uses, use_count')
    .eq('code', code)
    .eq('active', true)
    .single()

  if (fetchError || !bootcamp) {
    return NextResponse.json({ error: 'Invalid or inactive code' }, { status: 400 })
  }

  if (bootcamp.max_uses !== null && bootcamp.use_count >= bootcamp.max_uses) {
    return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
  }

  // Check if user already redeemed a bootcamp code — idempotent
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('bootcamp_code')
    .eq('id', user.id)
    .single()

  if (existingUser?.bootcamp_code) {
    return NextResponse.json({ ok: true, already_redeemed: true })
  }

  const planExpiresAt = new Date()
  planExpiresAt.setMonth(planExpiresAt.getMonth() + 6)

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      plan: bootcamp.plan_to_grant,
      bootcamp_code: code,
      plan_expires_at: planExpiresAt.toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[bootcamp/redeem update]', updateError)
    return NextResponse.json({ error: 'Failed to apply plan' }, { status: 500 })
  }

  // Increment use_count
  await supabaseAdmin
    .from('bootcamp_codes')
    .update({ use_count: bootcamp.use_count + 1 })
    .eq('code', code)

  return NextResponse.json({
    ok: true,
    plan: bootcamp.plan_to_grant,
    expires_at: planExpiresAt.toISOString(),
    bootcamp_name: bootcamp.name,
  })
}
