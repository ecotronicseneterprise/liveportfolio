import { createHmac } from 'crypto'
import { sendEmail } from '@/lib/email'
import { emailLayout, emailButton, escapeEmailText } from '@/lib/email-layout'

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
  return emailLayout(body, { unsubscribeUrl: unsubscribeLink(email) })
}

const ctaButton = emailButton

function para(text: string): string {
  return `<p style="color:#444;font-size:15px;line-height:1.7;margin:16px 0;">${text}</p>`
}

function heading(text: string): string {
  return `<h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">${text}</h1>`
}

// ── Flow A — Free users who haven't published ────────────────────────────────

const FLOW_A: Record<number, { subject: string; html: (email: string) => string }> = {
  1: {
    subject: 'Give your best project a clear story',
    html: (email) => baseLayout(`
      ${heading('Start with one project you are proud of.')}
      ${para('You do not need a long list of projects to start. Choose one and explain the problem, what you personally did, and what changed.')}
      ${para('<strong>A useful structure:</strong> “The challenge was … I built … The result was …” Add a real number if you have one; a clear, honest result is useful without one too.')}
      ${ctaButton('Improve my projects', DASHBOARD_URL)}
      ${para('You can keep editing privately on the Free plan. Publish when you are ready to share your work.')}
    `, email),
  },
  3: {
    subject: 'Three checks before you share your portfolio',
    html: (email) => baseLayout(`
      ${heading('Make your first impression easy to understand.')}
      ${para('Before publishing, check three things: your introduction says what you do, your strongest project explains your contribution, and your contact links work.')}
      ${para('Open the preview on your phone too. That is how many people will first see your work.')}
      ${para(`Ready to go live? Basic is <strong>${formatNaira(PLANS.basic.priceNgn ?? 0)} for 12 months</strong>. ${BILLING_COPY.pricingNote}.`)}
      ${ctaButton('Review and publish', DASHBOARD_URL)}
    `, email),
  },
  6: {
    subject: 'Put your work one click from your next application',
    html: (email) => baseLayout(`
      ${heading('Give people a simple way to explore your work.')}
      ${para('Once your portfolio is published, add its link to your CV, your LinkedIn Featured section, and your email signature. In applications, point to the project most relevant to the role.')}
      ${para('A portfolio does not guarantee an interview. It gives someone reviewing your application a place to see the detail behind your experience.')}
      ${ctaButton('Explore publishing plans', DASHBOARD_URL)}
    `, email),
  },
  12: {
    subject: 'Your portfolio is here when you are ready',
    html: (email) => baseLayout(`
      ${heading('Pick up where you left off.')}
      ${para('Your portfolio is saved. There is no need to finish everything in one sitting: update one project, check your introduction, or add a recent skill.')}
      ${para('You can continue editing privately on Free and choose a publishing plan later. If you are unsure what to add, reply and tell us where you are stuck.')}
      ${ctaButton('Continue editing', DASHBOARD_URL)}
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
    subject: 'See how people reach your work',
    html: (email) => baseLayout(`
      ${heading('Share your portfolio with a little more insight.')}
      ${para('Pro adds visitor analytics: recorded visits, approximate visitor counts, country when available, and traffic sources when the browser shares them.')}
      ${para('Use those signals to understand which places bring people to your work. They do not identify individual recruiters, and VPNs or privacy settings can affect the results.')}
      ${ctaButton('Explore Pro analytics', DASHBOARD_URL)}
    `, email),
  },
  21: {
    subject: 'Find a look that suits your work',
    html: (email) => baseLayout(`
      ${heading('Let your work lead the design.')}
      ${para(`You can preview every template with your own details. Pro lets you publish with all ${ALL_TEMPLATES.length} templates, including the role-specific designs.`)}
      ${para('Try a different look and check how your strongest project reads on mobile. Choose the design that makes your work easiest to understand, not simply the busiest one.')}
      ${ctaButton('Preview the templates', DASHBOARD_URL)}
    `, email),
  },
  45: {
    subject: 'Make your portfolio easier to share in person',
    html: (email) => baseLayout(`
      ${heading('One scan can open your work.')}
      ${para('Pro includes a QR code for your portfolio. Put it on a printed CV or bring it to an event so someone can open your work on their phone.')}
      ${para(`Pro is <strong>${formatNaira(PLANS.pro.priceNgn ?? 0)} for 12 months</strong> and also includes visitor analytics and all ${ALL_TEMPLATES.length} templates. ${BILLING_COPY.pricingNote}.`)}
      ${para('Basic still keeps your portfolio public while your plan is active. Upgrade only if these extras are useful to you.')}
      ${ctaButton('Compare my options', DASHBOARD_URL)}
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
    ${heading(`Your weekly career insight: ${score}/100`)}
    ${para(escapeEmailText(summary || 'Choose one project and make its result clearer this week.'))}
    ${para('This is a weekly AI insight based on your current portfolio. Your dashboard also shows a separate profile completeness score that rises as you add stronger details.')}
    ${ctaButton('Improve my portfolio', DASHBOARD_URL)}
  `, email)

  await sendEmail({
    to: email,
    subject: `Your weekly career insight: ${score}/100`,
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
  return `Keep it live: <strong>Basic</strong> is ${formatNaira(PLANS.basic.priceNgn ?? 0)} for 12 months (your own address, your portfolio stays public). <strong>Pro</strong> is ${formatNaira(PLANS.pro.priceNgn ?? 0)} and adds all ${ALL_TEMPLATES.length} templates, who viewed your portfolio, a QR code and weekly personalized career insights. ${BILLING_COPY.pricingNote}.`
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
