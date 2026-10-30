import { SUPPORT_EMAIL } from '@/lib/brand'

export const escapeEmailText = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td bgcolor="#0A66C2" style="border-radius:8px;text-align:center;"><a href="${escapeEmailText(url)}" style="display:inline-block;padding:16px 24px;border:1px solid #0A66C2;border-radius:8px;font-size:16px;line-height:24px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeEmailText(text)}</a></td></tr></table>`
}

/** Body is trusted template markup; escape user values before interpolation. */
export function emailLayout(body: string, { preheader = 'One practical next step for your portfolio.', unsubscribeUrl }: { preheader?: string; unsubscribeUrl?: string } = {}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LivePortfolio</title></head>
<body style="margin:0;padding:0;background-color:#F3F6FA;color:#172B4D;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeEmailText(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F3F6FA"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:12px 20px 24px;font-size:21px;font-weight:700;color:#0A66C2;">LivePortfolio<span style="color:#52647A;font-size:13px;font-weight:400;"> · Your work, clearly presented</span></td></tr>
<tr><td bgcolor="#FFFFFF" style="padding:28px 24px;border:1px solid #DFE6EF;border-top:4px solid #0A66C2;border-radius:12px;word-break:break-word;">${body}</td></tr>
<tr><td style="padding:24px 20px;font-size:13px;line-height:21px;color:#52647A;">Need a hand? Reply to this email or <a href="mailto:${escapeEmailText(SUPPORT_EMAIL)}" style="color:#0A66C2;">contact support</a>.<br>LivePortfolio · Ecotronics Enterprise
${unsubscribeUrl ? `<br><a href="${escapeEmailText(unsubscribeUrl)}" style="display:inline-block;padding:12px 0;color:#52647A;text-decoration:underline;">Unsubscribe from portfolio tips</a>` : ''}</td></tr>
</table></td></tr></table></body></html>`
}

export function renderPortfolioWelcome(firstName: string, previewUrl: string, address?: string): string {
  return emailLayout(`
<h1 style="margin:0 0 16px;font-size:26px;line-height:34px;color:#172B4D;">Welcome to LivePortfolio, ${escapeEmailText(firstName)}.</h1>
<p style="font-size:16px;line-height:26px;color:#42526E;">Your work deserves more than a line on your CV. Your portfolio is ready to review and make your own.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F0F6FD"><tr><td style="padding:18px;font-size:15px;line-height:25px;color:#172B4D;">
<strong>Start with these three checks</strong><br>1. Does your introduction explain what you do?<br>2. Does one project show your contribution and its result?<br>3. Are your contact details correct?</td></tr></table>
${emailButton('Review my portfolio', previewUrl)}
<p style="font-size:15px;line-height:25px;color:#42526E;">On the Free plan, you can edit and preview privately. When you are ready to share publicly, choose a publishing plan from your dashboard.</p>
${address ? `<p style="font-size:14px;line-height:24px;color:#52647A;">Your portfolio address: <strong>${escapeEmailText(address)}</strong></p>` : ''}
`, { preheader: 'Your portfolio is ready. Three small checks will help you make it yours.' })
}
