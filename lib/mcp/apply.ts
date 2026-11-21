// The ONLY write path for the assistant tools and for approvals: validated typed operations -> revision + compare-and-set.
// Same rules as PATCH /api/update and POST /api/revisions (plan checks, Pro designs), recorded as source 'assistant' / 'restore'.
import { getSupabaseAdmin } from '@/lib/supabase'
import { entitlements } from '@/lib/entitlements'
import { canUseTemplate, isTemplateId } from '@/lib/plans'
import { OpError, applyOps } from '@/lib/portfolio/ops'
import { commitState } from '@/lib/portfolio/commit'
import { canTransitionProDesigns } from '@/lib/portfolio/presentation'

export interface OwnPortfolio { id: string; user_id: string; content: Record<string, unknown>; template: string; edit_count: number | null }
export type Applied =
  | { ok: true; unchanged?: boolean; version: number | null; summary: string[]; revision_id: string | null }
  | { ok: false; code: string; message: string }

export async function ownPortfolio(userId: string): Promise<OwnPortfolio | null> {
  const { data } = await getSupabaseAdmin().from('portfolios').select('id, user_id, content, template, edit_count').eq('user_id', userId).single()
  return (data as OwnPortfolio | null) ?? null
}

const CONFLICT = { ok: false as const, code: 'conflict', message: 'The portfolio changed since it was last read. Call portfolio_get again and retry.' }

/** Dry run: what the operations WOULD change. Nothing is saved. */
export function dryRun(pf: OwnPortfolio, ops: unknown): { ok: true; summary: string[] } | { ok: false; code: string; message: string } {
  try {
    return { ok: true, summary: applyOps({ content: pf.content ?? {}, template: pf.template ?? 'minimal' }, ops).changes }
  } catch (e) {
    if (e instanceof OpError) return { ok: false, code: e.code, message: e.message }
    throw e
  }
}

export async function applyForUser(userId: string, ops: unknown, opts: { expectedVersion?: number | null } = {}): Promise<Applied> {
  const ent = await entitlements(userId)
  if (!ent.canEdit) return { ok: false, code: 'not_allowed', message: 'Editing is not available on this plan.' }
  const pf = await ownPortfolio(userId)
  if (!pf) return { ok: false, code: 'not_found', message: 'No portfolio found for this account.' }
  if (opts.expectedVersion !== undefined && opts.expectedVersion !== null && opts.expectedVersion !== (pf.edit_count ?? 0)) return CONFLICT

  if (Array.isArray(ops)) {
    for (const o of ops as Array<{ op?: string; template?: unknown }>) {
      if (o?.op !== 'set_template') continue
      if (!isTemplateId(o.template)) return { ok: false, code: 'invalid_template', message: 'Unknown template. Call portfolio_list_templates.' }
      if (o.template !== pf.template && !canUseTemplate(ent.plan, o.template)) return { ok: false, code: 'template_locked', message: 'That design is not available on this account.' }
    }
  }
  let result
  try {
    result = applyOps({ content: pf.content ?? {}, template: pf.template ?? 'minimal' }, ops)
  } catch (e) {
    if (e instanceof OpError) return { ok: false, code: e.code, message: e.message }
    throw e
  }
  if (!canTransitionProDesigns(ent.plan, pf.content?.pro_designs, result.state.content.pro_designs)) return { ok: false, code: 'pro_design_locked', message: 'That design is not available on this account.' }
  if (result.changes.length === 0) return { ok: true, unchanged: true, version: pf.edit_count ?? 0, summary: [], revision_id: null }

  const done = await commitState(pf, result.state, { source: 'assistant', summary: result.changes, requireRevisions: true })
  if (!done.ok) {
    if (done.error === 'conflict') return CONFLICT
    if (done.error === 'revisions_unavailable') return { ok: false, code: 'unavailable', message: 'History is not available, so the assistant cannot edit right now.' }
    return { ok: false, code: 'update_failed', message: 'The change could not be saved.' }
  }
  return { ok: true, version: done.edit_count, summary: result.changes, revision_id: done.revision_id }
}

/** Restore the version from before a revision (default: the latest change). Recorded as a revision itself, so it can be undone. */
export async function restoreForUser(userId: string, revisionId: string | null, opts: { onlyIfLatestIsAssistant?: boolean } = {}): Promise<Applied> {
  const ent = await entitlements(userId)
  if (!ent.canEdit) return { ok: false, code: 'not_allowed', message: 'Editing is not available on this plan.' }
  const pf = await ownPortfolio(userId)
  if (!pf) return { ok: false, code: 'not_found', message: 'No portfolio found for this account.' }
  const admin = getSupabaseAdmin()
  type Rev = { id: string; content: Record<string, unknown>; template: string | null; created_at: string; source?: string }
  let q = admin.from('portfolio_revisions').select('id, content, template, created_at, source').eq('portfolio_id', pf.id).eq('user_id', userId)
  q = revisionId ? q.eq('id', revisionId) : q.order('created_at', { ascending: false }).limit(1)
  const { data } = await q
  const rev = ((data as Rev[] | null) ?? [])[0]
  if (!rev) return { ok: false, code: 'not_found', message: 'There is nothing to restore.' }
  if (opts.onlyIfLatestIsAssistant && rev.source !== 'assistant') return { ok: false, code: 'not_assistant_change', message: 'The most recent change was made in your dashboard, not by an assistant, so undoing it here could remove your own edit. Use History in your dashboard, or portfolio_list_history and portfolio_restore_revision (which needs your approval).' }
  const wanted = typeof rev.template === 'string' && isTemplateId(rev.template) ? rev.template : pf.template
  const template = wanted === pf.template || canUseTemplate(ent.plan, wanted) ? wanted : pf.template
  if (!canTransitionProDesigns(ent.plan, pf.content?.pro_designs, rev.content?.pro_designs)) return { ok: false, code: 'pro_design_locked', message: 'That version uses a design not available on this account.' }
  if (JSON.stringify(rev.content) === JSON.stringify(pf.content) && template === pf.template) return { ok: false, code: 'already_current', message: 'That version is the one you have now.' }
  const when = new Date(rev.created_at).toISOString().slice(0, 16).replace('T', ' ')
  const summary = [`Restored the version from before ${when} UTC`]
  const done = await commitState(pf, { content: rev.content ?? {}, template }, { source: 'restore', summary, requireRevisions: true })
  if (!done.ok) return done.error === 'conflict' ? CONFLICT : { ok: false, code: 'update_failed', message: 'The restore could not be saved.' }
  return { ok: true, version: done.edit_count, summary, revision_id: done.revision_id }
}
