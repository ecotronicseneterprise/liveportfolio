import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(page('Invalid link', 'This unsubscribe link is invalid or has expired.'), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  let email: string
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8')
    if (!email.includes('@')) throw new Error('invalid')
  } catch {
    return new NextResponse(page('Invalid link', 'This unsubscribe link is invalid or has expired.'), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const supabaseAdmin = getSupabaseAdmin()
  await supabaseAdmin
    .from('email_subscribers')
    .update({ subscribed: false })
    .eq('email', email.trim().toLowerCase())

  return new NextResponse(page('Unsubscribed', `You have been unsubscribed. You will no longer receive emails from liveportfolio.site.`), {
    headers: { 'Content-Type': 'text/html' },
  })
}

function page(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — liveportfolio.site</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
            padding: 40px 32px; max-width: 400px; text-align: center; }
    h1 { font-size: 20px; font-weight: 700; color: #111; margin: 0 0 12px; }
    p  { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
    a  { color: #0A66C2; text-decoration: none; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://liveportfolio.site">← Back to liveportfolio.site</a>
  </div>
</body>
</html>`
}
