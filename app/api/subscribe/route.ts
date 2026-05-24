import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

// NOTE: instantiate Resend lazily inside the handler so missing env vars
// don't crash the module at build/import time.

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { email, user_id, source, portfolio_og_url } = await req.json()

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

    // Send Day-0 email (optional)
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not set; skipping confirmation email')
    } else {
      const resend = new Resend(resendApiKey)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
      await resend.emails.send({
      from: 'liveportfolio.site <hello@liveportfolio.site>',
      to: cleanEmail,
      subject: 'Your portfolio is ready',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="font-size: 22px; font-weight: 700; color: #0A0A0A; margin-bottom: 8px;">
            Your portfolio is ready to go live
          </h1>
          ${portfolio_og_url ? `
          <div style="margin: 24px 0; border-radius: 12px; overflow: hidden; border: 1px solid #eee;">
            <img src="${portfolio_og_url}" alt="Your portfolio" style="width: 100%; display: block;" />
          </div>
          ` : ''}
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
            This is what recruiters will see. Your AI-written portfolio is saved and ready — all that's left is making it live.
          </p>
          <a href="${appUrl}" style="display: inline-block; background: #1D9E75; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-size: 15px; font-weight: 600; margin-bottom: 32px;">
            Publish now — $19 →
          </a>
          <p style="color: #888; font-size: 13px; line-height: 1.6;">
            One-time payment. Your portfolio stays live permanently.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #aaa; font-size: 11px;">
            <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(cleanEmail)}" style="color: #aaa;">Unsubscribe</a>
          </p>
        </div>
      `,
    }).catch(() => {})
    }

    return NextResponse.json({ subscribed: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
