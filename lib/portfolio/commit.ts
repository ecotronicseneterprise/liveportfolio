// The one place a portfolio's content is written after generation (server only; uses the service role).
// commitState: snapshot the CURRENT state as a revision, then write the new state with a compare-and-set on edit_count, so two
// tabs (or, later, a tab and the assistant) can never silently overwrite each other. Undo = restore a snapshot, which is itself
// recorded, so nothing is ever destroyed.
//
// Revisions need public.portfolio_revisions (supabase/manual/20261026100000_portfolio_revisions.sql, run by hand). Until it exists
// edits still work and `revisions: false` is returned; callers that must not edit without a way back (the assistant) pass
// requireRevisions and get a refusal instead.
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { calculateHealthScore, deriveSeo } from './derive'
import type { PortfolioState } from './ops'

export type RevisionSource = 'dashboard' | 'assistant' | 'restore'
export const KEEP_REVISIONS = 50

export interface StoredPortfolio {
  id: string
  user_id: string
  content: Record<string, unknown>
  template: string
  edit_count: number | null
}

export type CommitResult =
  | { ok: true; updated_at: string; health_score: number; edit_count: number; revision_id: string | null; revisions: boolean }
  | { ok: false; status: 409 | 500 | 503; error: 'conflict' | 'update_failed' | 'revisions_unavailable' }

let warned = false
const warnOnce = (msg: string, code?: string) => {
  if (warned) return
  warned = true
  console.error(`[portfolio/commit] ${msg}${code ? ` (${code})` : ''}; edits continue without history until the migration is applied`)
}
export const _resetWarn = () => { warned = false }

export async function commitState(
  current: StoredPortfolio,
  next: PortfolioState,
  opts: { source: RevisionSource; summary: string[]; requireRevisions?: boolean },
): Promise<CommitResult> {
  const admin = getSupabaseAdmin()
  // 1. snapshot of what is about to be replaced
  let revisionId: string | null = null
  let revisions = true
  const snap = await admin
    .from('portfolio_revisions')
    .insert({ portfolio_id: current.id, user_id: current.user_id, content: current.content, template: current.template, summary: opts.summary.slice(0, 12), source: opts.source })
    .select('id')
    .single()
  if (snap.error || !snap.data) {
    revisions = false
    if (opts.requireRevisions) return { ok: false, status: 503, error: 'revisions_unavailable' }
    warnOnce('could not record a revision', (snap.error as { code?: string } | null)?.code)
  } else revisionId = (snap.data as { id: string }).id

  // 2. compare-and-set write
  const edit_count = (current.edit_count ?? 0) + 1
  let q = admin
    .from('portfolios')
    .update({
      content: next.content,
      template: next.template,
      health_score: calculateHealthScore(next.content),
      ...deriveSeo(next.content),
      edit_count,
    })
    .eq('id', current.id)
    .eq('user_id', current.user_id)
  q = current.edit_count == null ? q.is('edit_count', null) : q.eq('edit_count', current.edit_count)
  const { data: rows, error } = await q.select('updated_at, health_score')
  const row = Array.isArray(rows) ? rows[0] : rows
  if (error || !row) {
    if (revisionId) await admin.from('portfolio_revisions').delete().eq('id', revisionId) // nothing changed, so the snapshot is noise
    return error ? { ok: false, status: 500, error: 'update_failed' } : { ok: false, status: 409, error: 'conflict' }
  }

  // 3. keep the newest KEEP_REVISIONS, then bust the public page cache
  if (revisions) await prune(admin, current.id)
  await bust(admin, current.user_id)
  return { ok: true, updated_at: (row as { updated_at: string }).updated_at, health_score: (row as { health_score: number }).health_score, edit_count, revision_id: revisionId, revisions }
}

async function prune(admin: SupabaseClient, portfolioId: string) {
  try {
    const { data } = await admin.from('portfolio_revisions').select('id, created_at').eq('portfolio_id', portfolioId).limit(500)
    const rows = ((data as Array<{ id: string; created_at?: string; at?: string }> | null) ?? []).slice()
    const when = (r: { created_at?: string; at?: string }) => String(r.created_at ?? r.at ?? '')
    rows.sort((a, b) => when(a).localeCompare(when(b))) // oldest first
    const ids = rows.map((r) => r.id)
    const surplus = ids.length - KEEP_REVISIONS
    if (surplus > 0) await admin.from('portfolio_revisions').delete().in('id', ids.slice(0, surplus))
  } catch {
    // retention is best effort
  }
}

async function bust(admin: SupabaseClient, userId: string) {
  try {
    const { data } = await admin.from('users').select('slug').eq('id', userId).single()
    const slug = (data as { slug?: string } | null)?.slug
    if (slug) {
      // middleware rewrites /${slug} to /portfolio/${slug}; Next tracks them as separate cache keys
      revalidatePath(`/portfolio/${slug}`)
      revalidatePath(`/${slug}`)
    }
  } catch {
    // the 12-hour ISR window still applies
  }
}
