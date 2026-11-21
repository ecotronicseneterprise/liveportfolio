// Authenticates one /mcp call. Three independent checks: (1) the token is a real, unexpired Supabase token that was issued to an
// OAuth client (client_id), never a browser sign-in; (2) the person has an active, non-revoked connection row for THAT client;
// (3) the account is allowed (Pro / allow-list) and within its rate limit. Checked on every call, so revoking stops the next call.
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/getUserPlan'
import { checkAndRecordUsage } from '@/lib/usage'
import { ACCESS_MESSAGE, mcpAccess } from './access'
import { bearerToken, decodeClaims } from './token'

export interface McpCtx {
  userId: string
  email: string | null
  plan: 'free' | 'basic' | 'pro'
  connection: { id: string; client_id: string; client_name: string; allow_edits: boolean; share_contact: boolean }
}
export type McpAuth = { ok: true; ctx: McpCtx } | { ok: false; status: 401 | 403 | 429 | 503; code: string; message: string }

export const CALLS_PER_10_MIN = 120

export async function authenticateMcp(authorization: string | null): Promise<McpAuth> {
  const token = bearerToken(authorization)
  if (!token) return { ok: false, status: 401, code: 'unauthorized', message: 'Sign in to connect.' }
  const claims = decodeClaims(token)
  if (!claims?.client_id) return { ok: false, status: 401, code: 'invalid_token', message: 'This token was not issued to an assistant app.' }

  let user: { id: string; email?: string | null } | null = null
  try {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data, error } = await anon.auth.getUser(token)
    if (!error && data?.user) user = data.user
  } catch { /* falls through to 401 */ }
  if (!user) return { ok: false, status: 401, code: 'invalid_token', message: 'The token is invalid or expired.' }

  const admin = getSupabaseAdmin()
  const { data: conn, error: connErr } = await admin
    .from('mcp_connections')
    .select('id, client_id, client_name, allow_edits, share_contact, revoked_at, last_used_at')
    .eq('user_id', user.id)
    .eq('client_id', claims.client_id)
    .maybeSingle()
  if (connErr) return { ok: false, status: 503, code: 'unavailable', message: 'The assistant connection is not ready yet.' }
  const c = conn as (McpCtx['connection'] & { revoked_at: string | null; last_used_at: string | null }) | null
  if (!c || c.revoked_at) return { ok: false, status: 401, code: 'connection_revoked', message: 'This app is not connected to your account. Connect it again from the app.' }

  const plan = await getUserPlan(user.id)
  const access = mcpAccess(process.env, user.email ?? null, plan)
  if (access !== 'ok') return { ok: false, status: 403, code: access, message: ACCESS_MESSAGE[access] }

  if ((await checkAndRecordUsage(user.id, 'mcp_call', CALLS_PER_10_MIN, 10 * 60 * 1000, admin)) === 'limited') {
    return { ok: false, status: 429, code: 'rate_limited', message: 'Too many requests. Wait a few minutes.' }
  }
  if (!c.last_used_at || Date.now() - new Date(c.last_used_at).getTime() > 60_000) {
    void admin.from('mcp_connections').update({ last_used_at: new Date().toISOString() }).eq('id', c.id)
  }
  return { ok: true, ctx: { userId: user.id, email: user.email ?? null, plan, connection: { id: c.id, client_id: c.client_id, client_name: c.client_name, allow_edits: c.allow_edits, share_contact: c.share_contact } } }
}
