import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdmin } from '@/lib/supabase'
import { sendCohortStep } from '@/lib/cohort/send'
import { daysLeft } from '@/lib/cohort/schedule'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'

// POST /api/bootcamp/redeem { code }: gives the signed-in person 6 months of the plan attached to a cohort link (bootcamp or university).
// Called once, right after the account's profile row exists. Idempotent: a second call, or a second link, changes nothing. A person who
// has already paid for a plan is never touched (a cohort link must not downgrade or time-limit a paid plan).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { code?: unknown } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : ''
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

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('bootcamp_code, plan, email, slug')
    .eq('id', user.id)
    .single()

  // Already redeemed: idempotent, and it does not count against the limit a second time.
  if (existingUser?.bootcamp_code) {
    return NextResponse.json({ ok: true, already_redeemed: true })
  }
  // Already on a paid plan: leave it alone.
  if (existingUser?.plan && existingUser.plan !== 'unpublished') {
    return NextResponse.json({ ok: true, already_paid: true })
  }

  if (bootcamp.max_uses !== null && bootcamp.use_count >= bootcamp.max_uses) {
    return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
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

  // Count the use. Conditional on the count we read, so two people redeeming at the same moment cannot both pass the limit unnoticed.
  await supabaseAdmin
    .from('bootcamp_codes')
    .update({ use_count: bootcamp.use_count + 1 })
    .eq('code', code)
    .eq('use_count', bootcamp.use_count)

  // The first e-mail goes out now, not at the next daily run. Best effort: a failure never blocks the person (the daily job retries it).
  const email = existingUser?.email || user.email
  if (email) {
    try {
      await sendCohortStep(supabaseAdmin, { id: user.id, email }, 'welcome', {
        cohortName: bootcamp.name,
        daysLeft: daysLeft(planExpiresAt),
        endDate: planExpiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        portfolioUrl: `${APP_URL}/${existingUser?.slug ?? ''}`,
      })
    } catch (err) {
      console.error('[bootcamp/redeem welcome e-mail failed]', err instanceof Error ? err.message : 'unknown')
    }
  }

  return NextResponse.json({
    ok: true,
    plan: bootcamp.plan_to_grant,
    expires_at: planExpiresAt.toISOString(),
    bootcamp_name: bootcamp.name,
  })
}
