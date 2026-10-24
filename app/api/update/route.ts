import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { entitlements } from '@/lib/entitlements'
import { canUseTemplate, isTemplateId } from '@/lib/plans'
import { OpError, applyOps, type Op } from '@/lib/portfolio/ops'
import { commitState } from '@/lib/portfolio/commit'

// PATCH /api/update: the dashboard's save. Two body shapes, same pipeline:
//   { ops: Op[], portfolio_id? }                       typed operations (lib/portfolio/ops.ts)
//   { content?, template?, portfolio_id? }             the dashboard's whole-section save, turned into operations here
// Every change is validated by applyOps, recorded as a revision (so it can be undone) and written with a compare-and-set.
// No AI is involved. Nothing here publishes: publishing is driven by payment through the webhook only.
export async function PATCH(req: NextRequest) {
  try {
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

    const body = await req.json()
    const { content: contentUpdate, template, portfolio_id: claimedPortfolioId, ops: bodyOps } = body ?? {}

    // Plans (lib/plans.ts): every signed-in user may edit content privately; the template is validated against the plan here.
    const ent = await entitlements(user.id)
    if (!ent.canEdit) {
      return NextResponse.json({ error: 'Editing is not available on your plan' }, { status: 403 })
    }
    if (template !== undefined && template !== null && !isTemplateId(template)) {
      return NextResponse.json({ error: 'invalid_template' }, { status: 400 })
    }
    if (bodyOps !== undefined && (contentUpdate !== undefined || template !== undefined)) {
      return NextResponse.json({ error: 'invalid_request', message: 'Send either ops or content/template, not both.' }, { status: 400 })
    }

    // The portfolio is always the signed-in user's own (looked up by user_id, never by an id from the request). A request that
    // NAMES a portfolio id is refused unless it is that same one, so a tampered request fails loudly.
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id, user_id, content, template, edit_count, health_score')
      .eq('user_id', user.id)
      .single()

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }
    if (claimedPortfolioId !== undefined && claimedPortfolioId !== null && claimedPortfolioId !== portfolio.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Legacy body shape -> operations
    let ops: unknown
    if (bodyOps !== undefined) ops = bodyOps
    else {
      const list: Op[] = []
      if (contentUpdate && typeof contentUpdate === 'object') list.push({ op: 'replace_content', content: contentUpdate as Record<string, unknown> })
      if (template) list.push({ op: 'set_template', template })
      ops = list
    }
    if (Array.isArray(ops) && ops.length === 0) {
      // nothing to do (the old route also accepted an empty body)
      return NextResponse.json({ updated_at: null, health_score: (portfolio as { health_score?: number | null }).health_score ?? null, changes: [], revision_id: null, unchanged: true })
    }

    // A Pro template can only be SELECTED on Pro. Re-sending the template already stored is fine (a lapsed Pro user saving
    // other edits must not be rejected for a template they already had).
    const stored = portfolio as unknown as { template?: string }
    if (Array.isArray(ops)) {
      for (const o of ops as Array<{ op?: string; template?: unknown }>) {
        if (o?.op !== 'set_template') continue
        if (!isTemplateId(o.template)) return NextResponse.json({ error: 'invalid_template' }, { status: 400 })
        if (o.template !== stored.template && !canUseTemplate(ent.plan, o.template)) {
          return NextResponse.json({ error: 'template_locked', message: 'That template is included with Pro.' }, { status: 403 })
        }
      }
    }

    let result
    try {
      result = applyOps({ content: (portfolio.content ?? {}) as Record<string, unknown>, template: stored.template ?? 'minimal' }, ops)
    } catch (e) {
      if (e instanceof OpError) return NextResponse.json({ error: e.code, message: e.message, op_index: e.index }, { status: 400 })
      throw e
    }

    if (result.changes.length === 0) {
      return NextResponse.json({ updated_at: null, health_score: (portfolio as { health_score?: number | null }).health_score ?? null, changes: [], revision_id: null, unchanged: true })
    }

    const done = await commitState(
      { id: portfolio.id, user_id: user.id, content: (portfolio.content ?? {}) as Record<string, unknown>, template: stored.template ?? 'minimal', edit_count: (portfolio as { edit_count?: number | null }).edit_count ?? null },
      result.state,
      { source: 'dashboard', summary: result.changes },
    )
    if (!done.ok) {
      if (done.error === 'conflict') return NextResponse.json({ error: 'conflict', message: 'This portfolio changed somewhere else. Reload and try again.' }, { status: 409 })
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({
      updated_at: done.updated_at,
      health_score: done.health_score,
      edit_count: done.edit_count,
      changes: result.changes,
      revision_id: done.revision_id,
      revisions: done.revisions,
    })
  } catch (err) {
    console.error('[api/update] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
