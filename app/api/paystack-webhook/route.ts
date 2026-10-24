import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export const dynamic = 'force-dynamic'

type Plan = 'basic' | 'pro'
type PriceKey = Plan | 'test'
type Admin = ReturnType<typeof getSupabaseAdmin>
type PgError = { message: string; code?: string } | null
type User = { id: string; email: string; slug: string }

const YEAR_MS = 365 * 24 * 60 * 60 * 1000
const RENEWAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// A failure that must make Paystack retry (the handler answers 500). Everything else answers 200.
class Retryable extends Error {}
function check(error: PgError, what: string): void {
  if (error) throw new Retryable(`${what}: ${error.message}`)
}

// ─── Expected prices ──────────────────────────────────────────────────────────────────────────────────────
// Amounts are in the currency's SMALLEST unit (kobo / cents), exactly as Paystack sends them. A charge whose
// currency+amount is not listed for the resolved plan is LOGGED, and rejected (grants nothing) only when
// PAYSTACK_PRICE_CHECK=enforce; see priceCheckEnforced() below.
// Defaults are the NGN prices shown in components/UpgradeModal.tsx (Basic ₦15,000, Pro ₦45,000) and the ₦500 test plan.
// Override with PAYSTACK_EXPECTED_PRICES='{"basic":[{"currency":"NGN","amount":1500000},{"currency":"USD","amount":1000}],...}'
// (confirm these against the plans in the Paystack dashboard before relying on them).
type Price = { currency: string; amount: number }
const DEFAULT_PRICES: Record<PriceKey, Price[]> = {
  basic: [{ currency: 'NGN', amount: 1_500_000 }],
  pro: [{ currency: 'NGN', amount: 4_500_000 }],
  test: [{ currency: 'NGN', amount: 50_000 }],
}

function expectedPrices(key: PriceKey): Price[] {
  const raw = process.env.PAYSTACK_EXPECTED_PRICES
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Record<PriceKey, Price[]>>
      const list = parsed[key]
      if (Array.isArray(list) && list.every((p) => typeof p?.currency === 'string' && Number.isInteger(p?.amount))) {
        return list.map((p) => ({ currency: p.currency.toUpperCase(), amount: p.amount }))
      }
    } catch {
      console.error('[webhook] PAYSTACK_EXPECTED_PRICES is not valid JSON; using the built-in defaults')
    }
  }
  return DEFAULT_PRICES[key]
}

// Rollout switch. The default price table is a reading of the checkout UI, not of your Paystack plans, so until you have
// verified it in test mode a mismatch is only LOGGED and the payment is still honoured. Set PAYSTACK_PRICE_CHECK=enforce
// (Vercel env) to reject mismatches. A rejected payment is money taken with nothing granted, so enforce only after the
// 17-case test-mode checklist in docs/unification-plan.md passes.
const priceCheckEnforced = () => process.env.PAYSTACK_PRICE_CHECK === 'enforce'

function priceMatches(key: PriceKey, currency: unknown, amount: unknown): boolean {
  if (typeof currency !== 'string' || typeof amount !== 'number' || !Number.isFinite(amount)) return false
  const c = currency.toUpperCase()
  return expectedPrices(key).some((p) => p.currency === c && p.amount === amount)
}

// Tier comes ONLY from the Paystack plan code — never from the client-supplied reference.
// Unknown or missing codes return null and the event is ignored.
function resolvePlan(planCode: string | undefined, email: string): { plan: Plan; priceKey: PriceKey } | null {
  if (!planCode) return null

  const basic = process.env.PAYSTACK_BASIC_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_BASIC_PLAN_CODE
  const pro = process.env.PAYSTACK_PRO_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN_CODE
  const test = process.env.PAYSTACK_TEST_PLAN_CODE || process.env.NEXT_PUBLIC_PAYSTACK_TEST_PLAN_CODE

  if (basic && planCode === basic) return { plan: 'basic', priceKey: 'basic' }
  if (pro && planCode === pro) return { plan: 'pro', priceKey: 'pro' }

  // Test plan only counts for the owner's email — never arbitrary users
  if (test && planCode === test) {
    const allowed = (process.env.PAYSTACK_TEST_EMAIL || '').toLowerCase()
    if (allowed && email.toLowerCase() === allowed) return { plan: 'basic', priceKey: 'test' }
    console.warn('[webhook] test plan rejected for non-whitelisted email')
    return null
  }

  console.error('[webhook] unknown plan code, ignoring:', planCode)
  return null
}

function planObjectOf(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const p = (data.plan_object ?? data.plan) as Record<string, unknown> | string | undefined
  return p && typeof p === 'object' ? p : undefined
}

function planCodeOf(data: Record<string, unknown>): string | undefined {
  const p = (data.plan_object ?? data.plan) as Record<string, unknown> | string | undefined
  if (typeof p === 'string') return p || undefined
  return (p?.plan_code as string | undefined) || undefined
}

// ─── User lookup ──────────────────────────────────────────────────────────────────────────────────────────
// Prefer the user id the checkout put in `metadata.user_id`; fall back to the customer e-mail.
// Metadata is set by the browser, so it is NOT trusted to touch someone else's paid plan: when the id resolves to a
// user whose e-mail differs from the payer's, the payment may only activate an account that has no paid
// subscription yet (a gift or an e-mail change); it can never replace, extend or downgrade an existing one.
async function findUser(
  supabaseAdmin: Admin,
  email: string,
  metadataUserId?: unknown,
): Promise<{ user: User; viaId: boolean; emailMismatch: boolean } | null> {
  if (typeof metadataUserId === 'string' && UUID_RE.test(metadataUserId)) {
    const { data, error } = await supabaseAdmin.from('users').select('id, email, slug').eq('id', metadataUserId).maybeSingle()
    check(error, 'user lookup by id')
    const u = data as User | null
    if (u) {
      const mismatch = (u.email || '').toLowerCase() !== email.toLowerCase()
      if (mismatch) console.warn('[webhook] metadata user id and payer e-mail differ; grant-only mode')
      return { user: u, viaId: true, emailMismatch: mismatch }
    }
    console.warn('[webhook] metadata user id not found, falling back to e-mail')
  }

  const { data, error } = await supabaseAdmin.from('users').select('id, email, slug').eq('email', email.toLowerCase()).maybeSingle()
  check(error, 'user lookup by email')
  const u = data as User | null
  return u ? { user: u, viaId: false, emailMismatch: false } : null
}

// ─── Entitlement ──────────────────────────────────────────────────────────────────────────────────────────
// subscriptions.expires_at is the source of truth; users.plan is a cache kept in sync here
// and downgraded by /api/cron/expire-plans.
// `absoluteExpiry` (subscription.create) sets the date outright.
// Without it (charge.success) the call is first payment, renewal, or upgrade:
//   - same plan, expiry still > 30 days away  → duplicate/first-payment echo, leave dates alone
//   - same plan, expiry near/past             → renewal, extend one year from the later of now/expiry
//   - different plan or no subscription       → new term from now
// Throws Retryable on any database error, so the caller can undo its idempotency claim and answer 500.
// Returns 'applied' (first activation), 'renewed' (existing subscription updated) or 'skipped' (grant-only mode and the
// account already has a paid subscription).
async function applyEntitlement(
  supabaseAdmin: Admin,
  userId: string,
  plan: Plan,
  opts: { absoluteExpiry?: Date; grantOnly?: boolean } = {},
): Promise<'applied' | 'renewed' | 'skipped'> {
  const now = Date.now()

  const { data: current, error: curErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, plan, expires_at')
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  check(curErr, 'subscription lookup')

  if (opts.grantOnly && current && current.expires_at && new Date(current.expires_at).getTime() > now) return 'skipped'

  let expiresAt: Date
  if (opts.absoluteExpiry && !isNaN(opts.absoluteExpiry.getTime())) {
    expiresAt = opts.absoluteExpiry
  } else if (current && current.plan === plan && current.expires_at) {
    const currentExpiry = new Date(current.expires_at).getTime()
    if (currentExpiry - now > RENEWAL_WINDOW_MS) {
      expiresAt = new Date(currentExpiry)
    } else {
      expiresAt = new Date(Math.max(currentExpiry, now) + YEAR_MS)
    }
  } else {
    expiresAt = new Date(now + YEAR_MS)
  }

  if (current) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ plan, status: 'active', expires_at: expiresAt.toISOString() })
      .eq('id', current.id)
    check(error, 'subscription update')
  } else {
    const { error } = await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      plan,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    check(error, 'subscription insert')
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ plan, published_at: new Date().toISOString() })
    .eq('id', userId)
  check(updateError, 'user plan update')

  // 'applied' only for the first activation — callers use it to avoid emailing on renewals/echo events
  return current ? 'renewed' : 'applied'
}

// Takes access away after a refund: ends the user's subscriptions now and drops the plan, unless a separate
// time-boxed plan (bootcamp / invite) is still running.
async function revokeEntitlement(supabaseAdmin: Admin, userId: string) {
  const nowIso = new Date().toISOString()
  const { error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'expired', expires_at: nowIso })
    .eq('user_id', userId)
    .in('status', ['active', 'cancelled'])
  check(subErr, 'subscription revoke')

  const { data: u, error: uErr } = await supabaseAdmin.from('users').select('plan_expires_at').eq('id', userId).maybeSingle()
  check(uErr, 'user lookup (revoke)')
  if (u?.plan_expires_at && u.plan_expires_at > nowIso) return

  const { error } = await supabaseAdmin.from('users').update({ plan: 'unpublished' }).eq('id', userId)
  check(error, 'user downgrade')
}

// ─── Idempotency ──────────────────────────────────────────────────────────────────────────────────────────
// payments.ls_order_id is UNIQUE (the Paystack reference). Inserting the row FIRST is the claim: only one concurrent
// delivery can succeed; every other one gets a unique violation and does nothing. If the work after the claim fails,
// the claim is released so Paystack's retry can try again.
async function claimPayment(
  supabaseAdmin: Admin,
  userId: string,
  reference: string,
  plan: Plan,
  amount: number,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from('payments').insert({
    user_id: userId,
    ls_order_id: reference,
    product_tier: plan,
    amount_cents: amount,
  })
  if (!error) return true
  if (error.code === '23505') return false
  throw new Retryable(`payment claim: ${error.message}`)
}

async function releasePayment(supabaseAdmin: Admin, reference: string) {
  const { error } = await supabaseAdmin.from('payments').delete().eq('ls_order_id', reference)
  // If this fails the retry will see a "duplicate" and skip a payment that was never applied: reconcile it by hand.
  if (error) console.error('[webhook] RECONCILE BY HAND: could not release payment claim after a failed grant. reference', reference, 'error', error.message)
}

async function notifyLive(user: { email: string; slug: string }) {
  if (!process.env.RESEND_API_KEY) return
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://liveportfolio.site'
    await sendEmail({
      to: user.email,
      ...emailTemplates.portfolioLive(`${appUrl}/${user.slug}`),
    })
  } catch {
    // Never fail the webhook because of email
  }
}

const ok = () => NextResponse.json({ received: true })

// Verify → claim → apply, shared by subscription.create and charge.success.
async function grant(
  supabaseAdmin: Admin,
  args: { customerEmail: string; metadataUserId?: unknown; plan: Plan; reference: string; amount: number; absoluteExpiry?: Date },
) {
  const found = await findUser(supabaseAdmin, args.customerEmail, args.metadataUserId)
  if (!found) {
    console.error('[webhook] no user for this payment (reference', args.reference + ')')
    return ok()
  }
  const { user, emailMismatch } = found

  if (!(await claimPayment(supabaseAdmin, user.id, args.reference, args.plan, args.amount))) return ok() // duplicate delivery

  let result: 'applied' | 'renewed' | 'skipped'
  try {
    result = await applyEntitlement(supabaseAdmin, user.id, args.plan, { absoluteExpiry: args.absoluteExpiry, grantOnly: emailMismatch })
  } catch (err) {
    await releasePayment(supabaseAdmin, args.reference)
    throw err
  }
  if (result === 'skipped') {
    // keep the payment row (money was taken) but do not touch the account; it needs a human
    console.error('[webhook] payment by a different e-mail than the account holder; account already has a paid plan, not changed. reference', args.reference)
    return ok()
  }

  revalidatePath(`/portfolio/${user.slug}`)
  revalidatePath(`/${user.slug}`)
  if (result === 'applied') await notifyLive(user)
  return ok()
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    console.error('[paystack-webhook] PAYSTACK_SECRET_KEY is not set — rejecting request')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex')
  const sig = req.headers.get('x-paystack-signature') || ''
  const hashBuf = Buffer.from(hash)
  const sigBuf = Buffer.from(sig)
  if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    return ok()
  }

  // After the signature check: 200 for anything we deliberately ignore or can never process (Paystack would only
  // retry it for days); 500 for database failures, which a retry can fix.
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const data = event.data || {}
    const customer = data.customer as Record<string, unknown> | undefined
    const customerEmail = (customer?.email as string | undefined)?.trim()
    const metadata = (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<string, unknown>

    // ─── subscription.create ──────────────────────────────────────────────────
    if (event.event === 'subscription.create') {
      const subscriptionCode = data.subscription_code as string | undefined
      if (!customerEmail || !subscriptionCode) return ok()

      const resolved = resolvePlan(planCodeOf(data), customerEmail)
      if (!resolved) return ok()

      const planObj = planObjectOf(data)
      if (!priceMatches(resolved.priceKey, planObj?.currency, planObj?.amount)) {
        const detail = ['plan', resolved.priceKey, 'currency', String(planObj?.currency), 'amount', String(planObj?.amount)]
        if (priceCheckEnforced()) {
          console.error('[webhook] subscription.create price mismatch, nothing granted.', ...detail)
          return ok()
        }
        console.warn('[webhook] subscription.create price mismatch (log-only: PAYSTACK_PRICE_CHECK is not "enforce"), granting.', ...detail)
      }

      const next = data.next_payment_date as string | undefined
      return await grant(supabaseAdmin, {
        customerEmail,
        metadataUserId: metadata.user_id,
        plan: resolved.plan,
        reference: subscriptionCode,
        amount: typeof planObj?.amount === 'number' ? planObj.amount : 0,
        absoluteExpiry: next ? new Date(next) : undefined,
      })
    }

    // ─── subscription.disable / not_renew ─────────────────────────────────────
    // Access continues until expires_at; the expiry cron downgrades afterwards.
    if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
      if (customerEmail) {
        const found = await findUser(supabaseAdmin, customerEmail)
        if (found) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', found.user.id)
            .eq('status', 'active')
          check(error, 'subscription cancel')
        }
      }
      return ok()
    }

    // ─── charge.success (first payment, renewal, upgrade) ─────────────────────
    if (event.event === 'charge.success') {
      const reference = data.reference as string | undefined
      if (!customerEmail || !reference) return ok()

      // Not a plan transaction (or unknown plan) → nothing to grant
      const resolved = resolvePlan(planCodeOf(data), customerEmail)
      if (!resolved) return ok()

      if (!priceMatches(resolved.priceKey, data.currency, data.amount)) {
        const detail = ['reference', reference, 'plan', resolved.priceKey, 'currency', String(data.currency), 'amount', String(data.amount)]
        if (priceCheckEnforced()) {
          console.error('[webhook] charge.success price mismatch, nothing granted.', ...detail)
          return ok()
        }
        console.warn('[webhook] charge.success price mismatch (log-only: PAYSTACK_PRICE_CHECK is not "enforce"), granting.', ...detail)
      }

      return await grant(supabaseAdmin, {
        customerEmail,
        metadataUserId: metadata.user_id,
        plan: resolved.plan,
        reference,
        amount: typeof data.amount === 'number' ? data.amount : 0,
      })
    }

    // ─── refund.processed ─────────────────────────────────────────────────────
    // Marks the payment refunded and takes access away. Only a refund of the full amount revokes access;
    // a partial refund is logged for a human. (Refunding does not cancel the Paystack subscription: cancel it in the
    // dashboard or it will charge again at renewal.)
    if (event.event === 'refund.processed') {
      const txRef = (data.transaction_reference ?? (data.transaction as Record<string, unknown> | undefined)?.reference) as string | undefined
      if (!txRef) return ok()

      const { data: payment, error: payErr } = await supabaseAdmin
        .from('payments')
        .select('id, user_id, amount_cents, refunded_at')
        .eq('ls_order_id', txRef)
        .maybeSingle()
      check(payErr, 'payment lookup (refund)')
      if (!payment) {
        console.error('[webhook] refund for an unknown payment reference', txRef)
        return ok()
      }
      if (payment.refunded_at) return ok() // duplicate delivery

      const refunded = Number(data.amount)
      if (!Number.isFinite(refunded) || refunded < Number(payment.amount_cents)) {
        console.error('[webhook] partial or unreadable refund; access NOT revoked, review by hand. reference', txRef)
        return ok()
      }

      // revoke first, mark second: a failure in between leaves refunded_at null, so the retry runs it again
      await revokeEntitlement(supabaseAdmin, payment.user_id)
      const { error: markErr } = await supabaseAdmin.from('payments').update({ refunded_at: new Date().toISOString() }).eq('id', payment.id)
      check(markErr, 'payment mark refunded')

      const { data: u } = await supabaseAdmin.from('users').select('slug').eq('id', payment.user_id).maybeSingle()
      if (u?.slug) {
        revalidatePath(`/portfolio/${u.slug}`)
        revalidatePath(`/${u.slug}`)
      }
      return ok()
    }
  } catch (err) {
    if (err instanceof Retryable) {
      console.error('[paystack-webhook] database error, asking Paystack to retry:', err.message)
    } else {
      console.error('[paystack-webhook] unhandled error, asking Paystack to retry:', err)
    }
    return NextResponse.json({ error: 'retry' }, { status: 500 })
  }

  return ok()
}
