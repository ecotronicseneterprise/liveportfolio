import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'

function calculateHealthScore(content: Record<string, unknown>): number {
  let score = 0
  if (content.avatar_url) score += 10
  if (content.github_url) score += 10
  if (content.linkedin_url) score += 10
  const projects = content.projects as Array<{ outcome?: string }> | undefined
  if (projects && projects.length >= 3) score += 20
  if (projects) {
    const withMetric = projects.filter((p) => /\d/.test(p.outcome || '')).length
    score += Math.min(withMetric * 5, 15)
  }
  const about = content.about as string | undefined
  if (about && about.split(' ').length > 100) score += 10
  const skills = content.skills as string[] | undefined
  if (skills && skills.length >= 5) score += 10
  const experience = content.experience as unknown[] | undefined
  if (experience && experience.length > 0) score += 15
  return Math.min(score, 100)
}

export async function PATCH(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content: contentUpdate, template } = await req.json()

  // Content editing requires the Pro plan; template switching is open to all authenticated users
  if (contentUpdate) {
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!userRecord || userRecord.plan !== 'pro') {
      return NextResponse.json({ error: 'Editing requires the Pro plan' }, { status: 403 })
    }
  }

  // Get current portfolio
  const { data: portfolio } = await supabaseAdmin
    .from('portfolios')
    .select('id, content')
    .eq('user_id', user.id)
    .single()

  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
  }

  const mergedContent = contentUpdate
    ? { ...(portfolio.content as Record<string, unknown>), ...contentUpdate }
    : (portfolio.content as Record<string, unknown>)

  const healthScore = calculateHealthScore(mergedContent)

  const updateData: Record<string, unknown> = {
    content: mergedContent,
    health_score: healthScore,
    edit_count: ((portfolio as unknown as { edit_count?: number }).edit_count || 0) + 1,
  }

  if (template) updateData.template = template

  const { data: updated, error } = await supabaseAdmin
    .from('portfolios')
    .update(updateData)
    .eq('id', portfolio.id)
    .select('updated_at, health_score')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Bust the 12-hour ISR cache so the live portfolio reflects changes immediately
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('slug')
    .eq('id', user.id)
    .single()

  if (userRow?.slug) {
    revalidatePath(`/portfolio/${userRow.slug}`)
  }

  return NextResponse.json(updated)
}
