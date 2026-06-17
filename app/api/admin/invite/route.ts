import { randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const KNOWN_PARTNERS = ['esther']

function authOk(req: NextRequest): boolean {
  const provided = req.headers.get('x-cron-secret') || ''
  const expected = process.env.CRON_SECRET || ''
  try {
    return (
      provided.length > 0 &&
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    partner_key?: string
    recipient_email?: string
    recipient_name?: string
    free_pro?: boolean
    expires_days?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { partner_key, recipient_email, recipient_name, free_pro = true, expires_days = 7 } = body

  if (!partner_key || !KNOWN_PARTNERS.includes(partner_key)) {
    return NextResponse.json({ error: 'Unknown partner_key' }, { status: 400 })
  }

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()

  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin.from('invite_tokens').insert({
    token,
    partner_key,
    recipient_email: recipient_email || null,
    recipient_name: recipient_name || null,
    free_pro,
    expires_at,
  })

  if (error) {
    console.error('[admin/invite]', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  return NextResponse.json({ url, token, expires_at })
}
