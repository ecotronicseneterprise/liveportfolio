import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'

// FIX 4: Rate limit — 3 per IP per hour
const ipCounts = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { email, user_id, source, portfolio_og_url, preview_url } = await req.json()

    // FIX 4: Only accept user_id when the caller is authenticated as that user
    let verifiedUserId: string | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token && user_id) {
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabaseUser.auth.getUser(token)
      if (user?.id === user_id) verifiedUserId = user_id
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 254)

    // Upsert into email_subscribers
    const { error } = await supabaseAdmin
      .from('email_subscribers')
      .upsert(
        {
          email: cleanEmail,
          user_id: verifiedUserId,
          source: source || 'preview_defer',
          portfolio_og_url: portfolio_og_url || null,
          subscribed: true,
          sequence_step: 0,
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )

    if (error) {
      console.error('Subscribe upsert error:', error)
    }

    // Send Day-0 email
    if (process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
      const linkUrl = preview_url || appUrl
      await sendEmail({
        to: cleanEmail,
        ...emailTemplates.savedProgress(linkUrl),
      }).catch(() => {})
    } else {
      console.warn('RESEND_API_KEY is not set; skipping confirmation email')
    }

    return NextResponse.json({ subscribed: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
