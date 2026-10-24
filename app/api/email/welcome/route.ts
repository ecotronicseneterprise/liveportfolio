import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { SLUG_RE } from '@/lib/slug'

export const dynamic = 'force-dynamic'

// POST /api/email/welcome — "your portfolio is ready" mail, sent once to the signed-in user.
//
// This used to be unauthenticated: anyone could post {email, name, slug} and have a branded mail with their own
// markup sent from our domain to any address. Now:
//   - a verified Bearer token is required;
//   - the recipient is the token's e-mail, never a value from the body;
//   - the portfolio must belong to that user (portfolioId from the body is only a lookup key);
//   - the slug and name come from our database, and every interpolated value is HTML-escaped;
//   - it is sent at most once per user (in-process guard + email_subscribers.sent_flows.welcome when that row exists).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Best-effort, per serverless instance; the persistent guard below is the real one.
const sentRecently = new Map<string, number>()
const RECENT_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authError } = await getSupabaseClient().auth.getUser(token)
  const user = authData?.user
  if (authError || !user || !user.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { portfolioId?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  if (typeof body.portfolioId !== 'string' || !UUID_RE.test(body.portfolioId)) {
    return NextResponse.json({ error: 'portfolioId required' }, { status: 400 })
  }

  const last = sentRecently.get(user.id)
  if (last && Date.now() - last < RECENT_MS) return NextResponse.json({ ok: true, skipped: true })

  const admin = getSupabaseAdmin()

  // The portfolio must be this user's.
  const { data: portfolio, error: pErr } = await admin
    .from('portfolios')
    .select('id, content')
    .eq('id', body.portfolioId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pErr) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  if (!portfolio) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Persistent once-only guard (only if the drip row exists for this e-mail).
  const to = user.email.toLowerCase()
  const { data: sub } = await admin.from('email_subscribers').select('id, sent_flows').eq('email', to).maybeSingle()
  const flows = (sub?.sent_flows && typeof sub.sent_flows === 'object' ? sub.sent_flows : {}) as Record<string, unknown>
  if (flows.welcome === true) return NextResponse.json({ ok: true, skipped: true })

  const { data: profile } = await admin.from('users').select('slug').eq('id', user.id).maybeSingle()
  const slug = typeof profile?.slug === 'string' && SLUG_RE.test(profile.slug) ? profile.slug : ''

  const content = (portfolio.content && typeof portfolio.content === 'object' ? portfolio.content : {}) as { name?: unknown }
  const rawName = typeof content.name === 'string' && content.name ? content.name : typeof body.name === 'string' ? body.name : ''
  const first = rawName.replace(/[\r\n]+/g, ' ').trim().split(/\s+/)[0]?.slice(0, 40) || 'there'
  const firstName = esc(first)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
  const previewUrl = `${appUrl}/preview/${portfolio.id}`

  const result = await sendEmail({
    to,
    subject: `${first.replace(/[\r\n]+/g, ' ')}, your portfolio is ready`,
    html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111;">
          <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;">Your portfolio is ready, ${firstName}.</h2>
          <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
            We've built your portfolio from the details you provided. Go see it — then hit Publish to make it live.
          </p>
          <a href="${esc(previewUrl)}" style="display:inline-block;background:#0A66C2;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:16px;margin-bottom:28px;">
            See my portfolio →
          </a>
          ${slug ? `<p style="color:#888;font-size:14px;line-height:1.6;margin:0;">
            Your portfolio will go live at <strong>liveportfolio.site/${esc(slug)}</strong> once you publish.
          </p>` : ''}
          <p style="color:#ccc;font-size:12px;margin-top:40px;border-top:1px solid #f0f0f0;padding-top:16px;">
            liveportfolio.site · Professional portfolios for tech talent
          </p>
        </div>
      `,
  })

  if (!result.success) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })

  sentRecently.set(user.id, Date.now())
  if (sentRecently.size > 2000) sentRecently.clear()
  if (sub?.id) {
    const { error } = await admin.from('email_subscribers').update({ sent_flows: { ...flows, welcome: true } }).eq('id', sub.id)
    if (error) console.error('[welcome] could not record the once-only flag')
  }

  return NextResponse.json({ ok: true })
}
