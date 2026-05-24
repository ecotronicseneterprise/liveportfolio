import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hash = createHmac('sha256', secret).update(payload).digest('hex')
    const a = Buffer.from(hash)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Always return 200 — Lemon Squeezy retries on non-200
  try {
    const payload = await req.text()
    const signature = req.headers.get('x-signature') || ''
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

    if (!verifySignature(payload, signature, secret)) {
      console.error('Webhook signature verification failed')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const event = JSON.parse(payload)
    const eventName = event?.meta?.event_name

    if (eventName !== 'order_created') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const orderData = event?.data?.attributes
    const lsOrderId = event?.data?.id?.toString()
    const userEmail = orderData?.user_email
    const productName = (orderData?.first_order_item?.product_name || '').toLowerCase()
    const amountCents = orderData?.total || 0

    if (!lsOrderId || !userEmail) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Idempotency check
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('ls_order_id', lsOrderId)
      .single()

    if (existingPayment) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Determine plan from product name
    const plan = productName.includes('professional') ? 'professional' : 'launch'

    // Find user by email
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, slug')
      .eq('email', userEmail)
      .single()

    if (!userData) {
      console.error(`Webhook: no user found for email ${userEmail}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Update user plan and published_at
    await supabaseAdmin
      .from('users')
      .update({
        plan,
        published_at: new Date().toISOString(),
      })
      .eq('id', userData.id)

    // Record payment
    await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userData.id,
        ls_order_id: lsOrderId,
        product_tier: plan,
        amount_cents: amountCents,
      })

    // Send confirmation email via Resend
    const portfolioUrl = `https://${userData.slug}.liveportfolio.site`
    await resend.emails.send({
      from: 'liveportfolio.site <hello@liveportfolio.site>',
      to: userEmail,
      subject: `Your portfolio is live at ${portfolioUrl}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #0A0A0A; margin-bottom: 8px;">
            Your portfolio is live! 🎉
          </h1>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Your professional portfolio is now live and accessible at:
          </p>
          <a href="${portfolioUrl}" style="display: inline-block; background: #1D9E75; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-size: 16px; font-weight: 600; margin-bottom: 32px;">
            Visit ${portfolioUrl} →
          </a>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Share your portfolio link with recruiters, add it to your LinkedIn profile, and include it in every job application.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #aaa; font-size: 12px;">
            You're on the ${plan === 'professional' ? 'Professional' : 'Launch'} plan.
            ${plan !== 'professional' ? '<a href="https://liveportfolio.site/dashboard" style="color: #1D9E75;">Upgrade to Professional</a> for custom domain support.' : ''}
          </p>
        </div>
      `,
    }).catch(() => {}) // Don't fail the webhook if email fails

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
