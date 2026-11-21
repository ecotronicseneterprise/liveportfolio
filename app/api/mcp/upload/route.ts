import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/server-auth'
import { checkAndRecordUsage } from '@/lib/usage'
import { attachImage } from '@/lib/mcp/attach'
import { ImageError, hashToken, normalizeImage, storeImage, targetFromString } from '@/lib/mcp/images'

// The person drops a picture here after their assistant gave them an upload link. Needs the person's own sign-in AND the one-time token.
// POST multipart: token, file. Browser sign-in tokens only.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((await checkAndRecordUsage(user.id, 'mcp_image', 30, 24 * 60 * 60 * 1000)) === 'limited') return NextResponse.json({ error: 'rate_limited', message: 'Too many pictures today.' }, { status: 429 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400 }) }
  const token = form.get('token')
  const file = form.get('file')
  if (typeof token !== 'string' || !(file instanceof Blob)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'too_large', message: 'That picture is too large.' }, { status: 413 })

  const admin = getSupabaseAdmin()
  const hash = hashToken(token)
  const { data: row } = await admin.from('mcp_uploads').select('id, target, status, expires_at').eq('token_hash', hash).eq('user_id', user.id).maybeSingle()
  const up = row as { id: string; target: string; status: string; expires_at: string } | null
  if (!up || up.status !== 'waiting' || new Date(up.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'link_expired', message: 'This upload link has expired or was already used. Ask your assistant for a new one.' }, { status: 410 })
  const target = targetFromString(up.target)
  if (!target) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const claim = await admin.from('mcp_uploads').update({ status: 'done' }).eq('id', up.id).eq('status', 'waiting').select('id')
  if (claim.error || !(claim.data as unknown[] | null)?.length) return NextResponse.json({ error: 'link_expired', message: 'This upload link was already used.' }, { status: 410 })
  const release = () => admin.from('mcp_uploads').update({ status: 'waiting' }).eq('id', up.id)

  try {
    const jpeg = await normalizeImage(Buffer.from(await file.arrayBuffer()))
    const url = await storeImage(user.id, target, jpeg)
    const applied = await attachImage(user.id, target, url)
    if (!applied.ok) { await release(); return NextResponse.json({ error: applied.code, message: applied.message }, { status: 409 }) }
    return NextResponse.json({ ok: true, summary: applied.summary })
  } catch (e) {
    await release()
    if (e instanceof ImageError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'storage_failed' ? 500 : 400 })
    console.error('[mcp/upload] failed')
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
