import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { applyForUser, restoreForUser, ownPortfolio } from '@/lib/mcp/apply'

// The person approves or declines a change the assistant proposed. Browser sign-in tokens only; the assistant cannot call this.
// GET ?id=   what is being proposed. POST {id, decision: 'approve' | 'reject'} decides it.
export const dynamic = 'force-dynamic'

type Row = { id: string; user_id: string; ops: { kind: 'ops'; ops: unknown[] } | { kind: 'restore'; revision_id: string | null }; summary: string[]; base_edit_count: number | null; status: string; expires_at: string }

async function load(id: string, userId: string): Promise<Row | null> {
  const { data } = await getSupabaseAdmin().from('mcp_proposals').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  return (data as Row | null) ?? null
}
const expired = (r: Row) => new Date(r.expires_at).getTime() < Date.now()

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const row = await load(id, user.id)
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ id: row.id, summary: row.summary, status: row.status === 'pending' && expired(row) ? 'expired' : row.status, expires_at: row.expires_at })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let b: { id?: unknown; decision?: unknown } = {}
  try { b = await req.json() } catch { /* below */ }
  if (typeof b.id !== 'string' || (b.decision !== 'approve' && b.decision !== 'reject')) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  const row = await load(b.id, user.id)
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (row.status !== 'pending') return NextResponse.json({ error: 'already_decided', status: row.status }, { status: 409 })
  const admin = getSupabaseAdmin()

  if (b.decision === 'reject') {
    await admin.from('mcp_proposals').update({ status: 'rejected' }).eq('id', row.id).eq('user_id', user.id).eq('status', 'pending')
    return NextResponse.json({ ok: true, status: 'rejected' })
  }
  if (expired(row)) return NextResponse.json({ error: 'expired', message: 'This request expired. Ask your assistant to make it again.' }, { status: 410 })

  // Claim it first (single use), so a double click cannot apply twice.
  const claim = await admin.from('mcp_proposals').update({ status: 'applied' }).eq('id', row.id).eq('user_id', user.id).eq('status', 'pending').select('id')
  if (claim.error || !(claim.data as unknown[] | null)?.length) return NextResponse.json({ error: 'already_decided' }, { status: 409 })

  const release = () => admin.from('mcp_proposals').update({ status: 'pending' }).eq('id', row.id).eq('user_id', user.id)
  const pf = await ownPortfolio(user.id)
  if (!pf) { await release(); return NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  if (row.base_edit_count !== null && row.base_edit_count !== (pf.edit_count ?? 0)) {
    await admin.from('mcp_proposals').update({ status: 'rejected' }).eq('id', row.id)
    return NextResponse.json({ error: 'conflict', message: 'Your portfolio changed after this was proposed. Ask your assistant to propose it again.' }, { status: 409 })
  }
  const result = row.ops.kind === 'restore' ? await restoreForUser(user.id, row.ops.revision_id) : await applyForUser(user.id, row.ops.ops, { expectedVersion: row.base_edit_count })
  if (!result.ok) {
    await admin.from('mcp_proposals').update({ status: 'rejected' }).eq('id', row.id)
    return NextResponse.json({ error: result.code, message: result.message }, { status: 409 })
  }
  return NextResponse.json({ ok: true, status: 'applied', summary: result.summary })
}
