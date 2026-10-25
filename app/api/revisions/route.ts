import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { entitlements } from '@/lib/entitlements'
import { canUseTemplate, isTemplateId } from '@/lib/plans'
import { commitState } from '@/lib/portfolio/commit'
import { canTransitionProDesigns } from '@/lib/portfolio/presentation'

// A revision row is the portfolio as it was BEFORE one change; `summary` lists what that change was. So "restore" means
// "go back to before that change". Restoring is itself recorded (the state you leave becomes a revision), so it can be undone too.
const PUBLIC_COLS = 'id, created_at, source, summary'

async function ownPortfolio(userId: string) {
  const { data } = await getSupabaseAdmin()
    .from('portfolios')
    .select('id, user_id, content, template, edit_count')
    .eq('user_id', userId)
    .single()
  return data as { id: string; user_id: string; content: Record<string, unknown>; template: string; edit_count: number | null } | null
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pf = await ownPortfolio(user.id)
  if (!pf) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
  const { data, error } = await getSupabaseAdmin()
    .from('portfolio_revisions')
    .select(PUBLIC_COLS)
    .eq('portfolio_id', pf.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  // the table may not exist yet (migration not run): report that instead of failing the dashboard
  if (error) return NextResponse.json({ available: false, revisions: [] })
  return NextResponse.json({ available: true, revisions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ent = await entitlements(user.id)
  if (!ent.canEdit) return NextResponse.json({ error: 'Editing is not available on your plan' }, { status: 403 })

  let body: { revision_id?: unknown; latest?: unknown } = {}
  try { body = await req.json() } catch { /* empty body = undo latest */ }

  const pf = await ownPortfolio(user.id)
  if (!pf) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

  const admin = getSupabaseAdmin()
  type Rev = { id: string; content: Record<string, unknown>; template: string | null; created_at: string }
  let rev: Rev | null = null as Rev | null
  if (typeof body.revision_id === 'string') {
    const { data } = await admin
      .from('portfolio_revisions')
      .select('id, content, template, created_at')
      .eq('id', body.revision_id)
      .eq('portfolio_id', pf.id)
      .eq('user_id', user.id)
      .single()
    rev = data as Rev | null
  } else {
    const { data } = await admin
      .from('portfolio_revisions')
      .select('id, content, template, created_at')
      .eq('portfolio_id', pf.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    rev = ((data as Rev[] | null) ?? [])[0] ?? null
  }
  if (!rev) return NextResponse.json({ error: 'not_found', message: 'There is nothing to undo.' }, { status: 404 })

  // A restored template must still be one this plan may use; otherwise keep the current template and restore the content only.
  const wanted = typeof rev.template === 'string' && isTemplateId(rev.template) ? rev.template : pf.template
  const template = wanted === pf.template || canUseTemplate(ent.plan, wanted) ? wanted : pf.template

  if (!canTransitionProDesigns(ent.plan, pf.content?.pro_designs, rev.content?.pro_designs)) {
    return NextResponse.json({ error: 'pro_design_locked', message: 'Enabling a new Pro design requires Pro.' }, { status: 403 })
  }

  if (JSON.stringify(rev.content) === JSON.stringify(pf.content) && template === pf.template) {
    return NextResponse.json({ error: 'already_current', message: 'That version is the one you have now.' }, { status: 409 })
  }

  const when = new Date(rev.created_at).toISOString().slice(0, 16).replace('T', ' ')
  const done = await commitState(
    { id: pf.id, user_id: user.id, content: pf.content ?? {}, template: pf.template, edit_count: pf.edit_count ?? null },
    { content: rev.content ?? {}, template },
    { source: 'restore', summary: [`Restored the version from before ${when} UTC`] },
  )
  if (!done.ok) {
    if (done.error === 'conflict') return NextResponse.json({ error: 'conflict', message: 'This portfolio changed somewhere else. Reload and try again.' }, { status: 409 })
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, content: rev.content, template, health_score: done.health_score, updated_at: done.updated_at, edit_count: done.edit_count })
}
