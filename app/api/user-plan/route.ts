import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/getUserPlan'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // FIX 3: Require Bearer token; only return plan for the authenticated user
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ plan: 'free' })
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabaseUser.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ plan: 'free' })
  }

  const plan = await getUserPlan(user.id)
  return NextResponse.json({ plan })
}
