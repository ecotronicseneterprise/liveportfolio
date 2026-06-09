import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
const DASHBOARD_URL = `${APP_URL}/dashboard`

function unsubscribeLink(email: string): string {
  const token = Buffer.from(email).toString('base64url')
  return `${APP_URL}/api/unsubscribe?token=${token}`
}

function baseLayout(body: string, email: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                max-width:520px;margin:0 auto;padding:40px 24px;color:#111;">
      ${body}
      <p style="color:#bbb;font-size:12px;margin-top:40px;
                border-top:1px solid #f0f0f0;padding-top:16px;line-height:1.6;">
        liveportfolio.site · Professional portfolios for tech talent<br>
        <a href="${unsubscribeLink(email)}"
           style="color:#bbb;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `
}

function ctaButton(text: string, url: string): string {
  return `
    <a href="${url}"
       style="display:inline-block;background:#0A66C2;color:#fff;
              padding:12px 24px;border-radius:8px;text-decoration:none;
              font-weight:600;font-size:15px;margin-top:8px;">
      ${text}
    </a>
  `
}

function para(text: string): string {
  return `<p style="color:#444;font-size:15px;line-height:1.7;margin:16px 0;">${text}</p>`
}

function heading(text: string): string {
  return `<h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${text}</h1>`
}

// ── Flow A — Free users who haven't published ────────────────────────────────

const FLOW_A: Record<number, { subject: string; html: (email: string) => string }> = {
  1: {
    subject: 'Your portfolio is ready',
    html: (email) => baseLayout(`
      ${heading('Your portfolio is ready.')}
      ${para('You built it. It looks great. The only thing left is making it live so recruiters can actually find you.')}
      ${para('Publishing takes one click. Your portfolio goes live instantly at <strong>yourname.liveportfolio.site</strong> — permanent, no expiry.')}
      ${ctaButton('Publish my portfolio — from ₦15,000/year', DASHBOARD_URL)}
    `, email),
  },
  3: {
    subject: 'Your portfolio isn\'t live yet',
    html: (email) => baseLayout(`
      ${heading('Your portfolio isn\'t live yet.')}
      ${para('Job seekers with a live portfolio get significantly more recruiter responses than those without one. Yours is built and ready — it just needs to be published.')}
      ${para('Every day it sits unpublished is a day it isn\'t working for you.')}
      ${ctaButton('Go live now', DASHBOARD_URL)}
    `, email),
  },
  6: {
    subject: 'Recruiters can\'t find you yet',
    html: (email) => baseLayout(`
      ${heading('Recruiters can\'t find you yet.')}
      ${para('Your portfolio is built and sitting unpublished. While it\'s offline, recruiters searching for your skills are landing on someone else\'s page instead.')}
      ${para('₦15,000/year. That\'s less than one coffee per month to be findable.')}
      ${ctaButton('Publish today', DASHBOARD_URL)}
    `, email),
  },
  12: {
    subject: 'We saved your portfolio (for now)',
    html: (email) => baseLayout(`
      ${heading('We kept your portfolio.')}
      ${para('It\'s still here — your name, your projects, your work. Everything you built is saved and ready the moment you decide to go live.')}
      ${para('Whenever you\'re ready, publishing takes less than 60 seconds.')}
      ${ctaButton('Come back and publish', DASHBOARD_URL)}
    `, email),
  },
}

export async function sendFlowA(day: 1 | 3 | 6 | 12, email: string, portfolioUrl: string): Promise<void> {
  void portfolioUrl // available for future personalisation
  const template = FLOW_A[day]
  if (!template) return
  await sendEmail({ to: email, subject: template.subject, html: template.html(email) })
}

// ── Flow B — Basic users, upgrade to Pro ────────────────────────────────────

const FLOW_B: Record<number, { subject: string; html: (email: string) => string }> = {
  7: {
    subject: 'Do you know who\'s viewing your portfolio?',
    html: (email) => baseLayout(`
      ${heading('Your portfolio is live. But do you know who\'s viewing it?')}
      ${para('Pro shows you the company name, country, and traffic source for every visit. See "Someone from Andela · Nigeria · via LinkedIn" instead of just a number.')}
      ${para('That\'s the difference between knowing your portfolio is working and actually seeing it work.')}
      ${ctaButton('Upgrade to Pro — ₦45,000/year', DASHBOARD_URL)}
    `, email),
  },
  21: {
    subject: 'Your career score is waiting',
    html: (email) => baseLayout(`
      ${heading('Your AI career score is ready — you just need Pro to see it.')}
      ${para('Every week, our AI scores your portfolio out of 100 across four dimensions: online presence, project impact, experience, and skills. It gives you three specific things to improve.')}
      ${para('Pro users see their score trend over time. Yours is ready the moment you upgrade.')}
      ${ctaButton('See your score', DASHBOARD_URL)}
    `, email),
  },
  45: {
    subject: 'One feature that changes everything',
    html: (email) => baseLayout(`
      ${heading('Your own domain. Your name, not a subdomain.')}
      ${para('cliffordnwanna.com instead of cliffordnwanna.liveportfolio.site. Recruiters notice the difference. It signals that you take your professional presence seriously.')}
      ${para('Custom domain is a Pro feature. One upgrade, yours forever, at ₦45,000/year.')}
      ${ctaButton('Connect your domain', DASHBOARD_URL)}
    `, email),
  },
}

export async function sendFlowB(day: 7 | 21 | 45, email: string): Promise<void> {
  const template = FLOW_B[day]
  if (!template) return
  await sendEmail({ to: email, subject: template.subject, html: template.html(email) })
}

// ── Flow C — Retention emails ────────────────────────────────────────────────

export async function sendWeeklyScore(
  email: string,
  score: number,
  summary: string,
): Promise<void> {
  const html = baseLayout(`
    ${heading(`Your career score this week: ${score}/100`)}
    ${para(summary || 'Your portfolio is being seen. Keep improving it to stand out.')}
    ${para('Log in to see your full breakdown — presence, projects, experience, and skills — and track your trend over time.')}
    ${ctaButton('View my score', DASHBOARD_URL)}
  `, email)

  await sendEmail({
    to: email,
    subject: `Your career score this week: ${score}/100`,
    html,
  })
}

export async function sendMonthlyViews(
  email: string,
  viewCount: number,
  topSource: string,
): Promise<void> {
  const html = baseLayout(`
    ${heading(`Your portfolio got ${viewCount} view${viewCount === 1 ? '' : 's'} last month.`)}
    ${para(`Top traffic source: <strong>${topSource}</strong>.`)}
    ${para('The more places you share your link — job applications, LinkedIn bio, WhatsApp status, email signature — the more that number grows.')}
    ${ctaButton('Share my portfolio', DASHBOARD_URL)}
  `, email)

  await sendEmail({
    to: email,
    subject: `Your portfolio got ${viewCount} views last month`,
    html,
  })
}

export async function sendRenewalReminder(
  email: string,
  plan: 'basic' | 'pro',
  expiresAt: string,
): Promise<void> {
  const date = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const price = plan === 'pro' ? '₦45,000/year' : '₦15,000/year'

  const html = baseLayout(`
    ${heading('Your LivePortfolio plan renews in 30 days.')}
    ${para(`Your <strong>${plan === 'pro' ? 'Pro' : 'Basic'} plan</strong> (${price}) renews on <strong>${date}</strong>. Your portfolio stays live automatically — no action needed.`)}
    ${para('If you ever want to cancel or upgrade, you can do that from your dashboard settings.')}
    ${ctaButton('Manage my plan', `${DASHBOARD_URL}?tab=settings`)}
  `, email)

  await sendEmail({
    to: email,
    subject: 'Your LivePortfolio plan renews in 30 days',
    html,
  })
}
