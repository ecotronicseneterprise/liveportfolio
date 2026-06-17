import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated user
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { token?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token: inviteToken, user_id } = body

  if (!inviteToken || !user_id) {
    return NextResponse.json({ error: 'Missing token or user_id' }, { status: 400 })
  }

  // Confirm caller is acting on their own account
  if (user.id !== user_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Look up the token
  const { data: invite, error: lookupError } = await supabaseAdmin
    .from('invite_tokens')
    .select('*')
    .eq('token', inviteToken)
    .single()

  if (lookupError || !invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }
  if (invite.used) {
    return NextResponse.json({ error: 'Invite already used' }, { status: 400 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
  }

  // Atomically mark as used — WHERE used = false prevents race conditions
  const { error: consumeError } = await supabaseAdmin
    .from('invite_tokens')
    .update({ used: true, used_by_user_id: user_id, used_at: new Date().toISOString() })
    .eq('token', inviteToken)
    .eq('used', false)

  if (consumeError) {
    console.error('[invite/consume]', consumeError)
    return NextResponse.json({ error: 'Failed to consume invite' }, { status: 500 })
  }

  // If free_pro, upgrade the user immediately
  if (invite.free_pro) {
    const { error: upgradeError } = await supabaseAdmin
      .from('users')
      .update({ plan: 'pro', published_at: new Date().toISOString() })
      .eq('id', user_id)

    if (upgradeError) {
      console.error('[invite/consume upgrade]', upgradeError)
      return NextResponse.json({ error: 'Invite consumed but upgrade failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, upgraded: invite.free_pro === true })
}
