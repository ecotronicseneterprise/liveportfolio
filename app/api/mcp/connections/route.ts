import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { getUserPlan } from '@/lib/getUserPlan'
import { ACCESS_MESSAGE, mcpAccess } from '@/lib/mcp/access'

// The person's own assistant connections. Browser sign-in tokens only (assistant tokens are refused by the middleware).
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await getSupabaseAdmin()
    .from('mcp_connections')
    .select('id, client_name, allow_edits, share_contact, created_at, last_used_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ available: false, connections: [] })
  return NextResponse.json({ available: true, connections: data ?? [] })
}

// Called by the consent page just before it approves the app. Refuses accounts that may not connect (so they are told BEFORE approving).
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = mcpAccess(process.env, user.email, await getUserPlan(user.id))
  if (access !== 'ok') return NextResponse.json({ error: access, message: ACCESS_MESSAGE[access] }, { status: 403 })

  let b: { client_id?: unknown; client_name?: unknown; allow_edits?: unknown; share_contact?: unknown } = {}
  try { b = await req.json() } catch { /* below */ }
  if (typeof b.client_id !== 'string' || !b.client_id || b.client_id.length > 200) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  const name = typeof b.client_name === 'string' ? b.client_name.slice(0, 100) : ''
  const { error } = await getSupabaseAdmin()
    .from('mcp_connections')
    .upsert(
      { user_id: user.id, client_id: b.client_id, client_name: name, allow_edits: b.allow_edits !== false, share_contact: b.share_contact === true, revoked_at: null },
      { onConflict: 'user_id,client_id' },
    )
  if (error) return NextResponse.json({ error: 'unavailable', message: 'Could not save the connection yet.' }, { status: 503 })
  return NextResponse.json({ ok: true })
}

// Revoke one connection of this person's. The next tool call from that app is refused immediately.
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin()
    .from('mcp_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('client_id')
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  return NextResponse.json({ ok: true, client_id: (data as Array<{ client_id: string }> | null)?.[0]?.client_id ?? null })
}
