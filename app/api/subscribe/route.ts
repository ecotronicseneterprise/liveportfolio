import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { email, user_id, source, portfolio_og_url, preview_url } = await req.json()

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
          user_id: user_id || null,
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
