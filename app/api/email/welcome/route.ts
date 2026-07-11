import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, name, portfolioId, slug } = await req.json()
    if (!email || !portfolioId) {
      return NextResponse.json({ error: 'email and portfolioId required' }, { status: 400 })
    }

    const firstName = (name as string)?.split(' ')[0] ?? 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
    const previewUrl = `${appUrl}/preview/${portfolioId}`

    await sendEmail({
      to: email as string,
      subject: `${firstName}, your portfolio is ready`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#111;">
          <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;">Your portfolio is ready, ${firstName}.</h2>
          <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px;">
            We've built your portfolio from the details you provided. Go see it — then hit Publish to make it live.
          </p>
          <a href="${previewUrl}" style="display:inline-block;background:#0A66C2;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:16px;margin-bottom:28px;">
            See my portfolio →
          </a>
          <p style="color:#888;font-size:14px;line-height:1.6;margin:0;">
            Your portfolio will go live at <strong>liveportfolio.site/${slug ?? ''}</strong> once you publish.
          </p>
          <p style="color:#ccc;font-size:12px;margin-top:40px;border-top:1px solid #f0f0f0;padding-top:16px;">
            liveportfolio.site · Professional portfolios for tech talent
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
