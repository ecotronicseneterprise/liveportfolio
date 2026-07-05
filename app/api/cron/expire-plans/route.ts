import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: expiredUsers, error } = await supabase
    .from('users')
    .select('id, email, plan, bootcamp_code, plan_expires_at')
    .not('plan_expires_at', 'is', null)
    .lt('plan_expires_at', now)
    .neq('plan', 'unpublished')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!expiredUsers || expiredUsers.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 })
  }

  const ids = expiredUsers.map((u) => u.id)
  await supabase
    .from('users')
    .update({ plan: 'unpublished' })
    .in('id', ids)

  console.log(`Expired ${ids.length} bootcamp plans:`, ids)

  return NextResponse.json({ ok: true, expired: ids.length })
}
