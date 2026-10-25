import { createHmac } from 'crypto'
import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
const DASHBOARD_URL = `${APP_URL}/dashboard`

function unsubscribeLink(email: string): string {
  // FIX 5: HMAC-signed token prevents arbitrary email unsubscription
  const secret = process.env.UNSUBSCRIBE_SECRET || 'fallback-change-in-env'
  const sig = createHmac('sha256', secret).update(email.toLowerCase()).digest('hex')
  const token = Buffer.from(`${email.toLowerCase()}:${sig}`).toString('base64url')
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
      ${para('Publishing takes one click. Your portfolio goes live instantly at <strong>liveportfolio.site/yourname</strong> — permanent, no expiry.')}
      ${ctaButton('Publish my portfolio', DASHBOARD_URL)}
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
      ${para('Your portfolio is already built. One click makes it permanently findable.')}
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
      ${ctaButton('Upgrade to Pro', DASHBOARD_URL)}
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
      ${para('cliffordnwanna.com instead of liveportfolio.site/cliffordnwanna. Recruiters notice the difference. It signals that you take your professional presence seriously.')}
      ${para('Custom domain is a Pro feature. One upgrade and it\'s yours permanently.')}
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
  // One-time plans do not renew by themselves. This used to say "renews automatically", which was false for everyone who pays through
  // the one-time checkout (and that includes people who convert from a free cohort link).
  const html = baseLayout(`
    ${heading('Your LivePortfolio plan ends in 30 days.')}
    ${para(`Your <strong>${plan === 'pro' ? 'Pro' : 'Basic'} plan</strong> ends on <strong>${date}</strong>. It does <strong>not</strong> renew automatically: after that date your portfolio goes private (nothing is deleted).`)}
    ${para('To keep it live, renew from your dashboard. Renewing adds 12 months to the time you have left, so there is no rush to do it today.')}
    ${ctaButton('Renew my plan', `${DASHBOARD_URL}?tab=settings`)}
  `, email)

  await sendEmail({
    to: email,
    subject: 'Your LivePortfolio plan ends in 30 days',
    html,
  })
}

// ── Flow D: cohort access (bootcamp and university links) ───────────────────────────────────────────────
// The sequence for people who got 6 months of free access through a cohort link. Its job is to turn that access into a paid plan before it
// ends, honestly: it says what happens at the end (the portfolio goes private; nothing is deleted) and what keeping it live costs.
// Prices and the template count come from lib/plans.ts. Timing and dedupe live in lib/cohort/schedule.ts and lib/cohort/send.ts.
import type { CohortStep } from '@/lib/cohort/schedule'
import { ALL_TEMPLATES, PLANS } from '@/lib/plans'
import { BILLING_COPY, formatNaira } from '@/lib/billing/copy'

export interface CohortCtx {
  email: string
  cohortName: string
  daysLeft: number
  /** Human date the access ends, e.g. "25 April 2027". */
  endDate: string
  portfolioUrl: string
}

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

function keepLine(): string {
  return `Keep it live: <strong>Basic</strong> is ${formatNaira(PLANS.basic.priceNgn ?? 0)} for 12 months (your own address, your portfolio stays public). <strong>Pro</strong> is ${formatNaira(PLANS.pro.priceNgn ?? 0)} and adds all ${ALL_TEMPLATES.length} templates, who viewed your portfolio, a QR code and a weekly career score. ${BILLING_COPY.pricingNote}.`
}

export function renderCohortEmail(step: CohortStep, c: CohortCtx): { subject: string; html: string } {
  const who = esc(c.cohortName)
  const end = esc(c.endDate)
  const url = esc(c.portfolioUrl)
  const days = `${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}`
  const wrap = (body: string, subject: string) => ({ subject, html: baseLayout(body, c.email) })

  switch (step) {
    case 'welcome':
      return wrap(`
        ${heading('Your 6 months of free access has started.')}
        ${para(`You joined through <strong>${who}</strong>. Your access runs until <strong>${end}</strong>.`)}
        ${para(`Finish your portfolio and it goes live at <strong>${url}</strong>. Put that link on your CV and your LinkedIn profile today.`)}
        ${ctaButton('Open my dashboard', DASHBOARD_URL)}
      `, 'Your 6 months of free access has started')
    case 'share':
      return wrap(`
        ${heading('Put your link where people will see it.')}
        ${para('Three places that matter: the top of your CV, your LinkedIn headline or Featured section, and your WhatsApp status.')}
        ${para(`Your address: <strong>${url}</strong>`)}
        ${ctaButton('View my portfolio', c.portfolioUrl)}
      `, 'Put your portfolio link where people will see it')
    case 'cv':
      return wrap(`
        ${heading('Make your best project impossible to miss.')}
        ${para('Recruiters read the first project and its result. Put your strongest one first, and write what changed because of it, with a number if you have one.')}
        ${ctaButton('Edit my portfolio', DASHBOARD_URL)}
      `, 'Make your best project impossible to miss')
    case 'fresh':
      return wrap(`
        ${heading('Add what you have built since.')}
        ${para('A portfolio that changes is worth more than one that was finished once. Add a recent project or a new skill. It takes a few minutes and updates your live page.')}
        ${ctaButton('Update my portfolio', DASHBOARD_URL)}
      `, 'Add what you have built since')
    case 'halfway':
      return wrap(`
        ${heading('Halfway through your free access.')}
        ${para(`Your access ends on <strong>${end}</strong>. When it ends, your portfolio goes private and the link stops working for visitors. Nothing is deleted.`)}
        ${para(keepLine())}
        ${ctaButton('See my options', DASHBOARD_URL)}
      `, 'Halfway through your free access')
    case 'left30':
      return wrap(`
        ${heading(`${days} left on your free access.`)}
        ${para(`On <strong>${end}</strong> your portfolio goes private. If you are applying for roles, keep the link working for the people you have already sent it to.`)}
        ${para(keepLine())}
        ${ctaButton('Keep my portfolio live', DASHBOARD_URL)}
      `, `${days} left on your free access`)
    case 'left14':
      return wrap(`
        ${heading('Two weeks left.')}
        ${para(`Your free access ends on <strong>${end}</strong>. Any CV, LinkedIn profile or application that links to <strong>${url}</strong> will stop showing your work after that.`)}
        ${para(keepLine())}
        ${ctaButton('Keep my portfolio live', DASHBOARD_URL)}
      `, 'Two weeks left on your free access')
    case 'left7':
      return wrap(`
        ${heading('Seven days left.')}
        ${para(`Your portfolio goes private on <strong>${end}</strong>. If you are mid-application, this is the week to decide.`)}
        ${para(keepLine())}
        ${ctaButton('Keep my portfolio live', DASHBOARD_URL)}
      `, 'Seven days left on your free access')
    case 'left1':
      return wrap(`
        ${heading('Your free access ends tomorrow.')}
        ${para(`After <strong>${end}</strong> your portfolio is private. Everything you built stays saved, and you can bring it back at any time.`)}
        ${para(keepLine())}
        ${ctaButton('Keep my portfolio live', DASHBOARD_URL)}
      `, 'Your free access ends tomorrow')
    case 'ended':
      return wrap(`
        ${heading('Your free access has ended.')}
        ${para('Your portfolio is private now, and everything you built is saved. Visitors to your link will not see it until you choose a plan.')}
        ${para(keepLine())}
        ${ctaButton('Bring my portfolio back', DASHBOARD_URL)}
      `, 'Your free access has ended: your portfolio is saved')
    case 'after14':
      return wrap(`
        ${heading('Your portfolio is still saved.')}
        ${para('Your name, your projects and your work are all here. It goes live again the moment you pay.')}
        ${para(keepLine())}
        ${ctaButton('Bring my portfolio back', DASHBOARD_URL)}
      `, 'Your portfolio is still saved')
    case 'after45':
      return wrap(`
        ${heading('One last note about your saved portfolio.')}
        ${para('It is still saved and ready. If you are applying for roles, a live portfolio is one more thing that works for you while you sleep.')}
        ${para(keepLine())}
        ${ctaButton('Bring my portfolio back', DASHBOARD_URL)}
      `, 'Your saved portfolio is ready when you are')
  }
}

/** Sends one cohort e-mail. Resolves true only if the e-mail service accepted it (so the caller marks it sent only then). */
export async function sendCohortEmail(step: CohortStep, c: CohortCtx): Promise<boolean> {
  const { subject, html } = renderCohortEmail(step, c)
  const r = await sendEmail({ to: c.email, subject, html })
  return !!(r as { success?: boolean } | undefined)?.success
}
