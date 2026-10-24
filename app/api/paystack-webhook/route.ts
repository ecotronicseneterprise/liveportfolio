import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  applyEntitlement, check, claimPayment, releasePayment, notifyLive, revokeEntitlement, grantIntent, Retryable,
  type Admin, type Plan, type PgError,
} from '@/lib/billing/grant'
import { findIntent } from '@/lib/billing/intents'

export const dynamic = 'force-dynamic'

type PriceKey = Plan | 'test'
type User = { id: string; email: string; slug: string }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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


const ok = () => NextResponse.json({ received: true })

// One line for every event we do not act on, so a silent drop is findable in the logs (money taken, nothing granted).
// Fields: event type, reference, reason, amount, currency, whether a plan code was present. NEVER the e-mail or card data.
function logIgnored(reason: string, eventType: string, data?: Record<string, unknown>) {
  const d = data ?? {}
  const ref = [d.reference, d.subscription_code, d.transaction_reference].find((v) => typeof v === 'string' && v) as string | undefined
  const clean = (v: unknown) => String(v ?? 'n/a').replace(/[^\w.:-]/g, '_').slice(0, 80)
  console.warn(
    `[paystack-webhook] ignored event=${clean(eventType)} reason=${reason} reference=${ref ? clean(ref) : 'none'} amount=${typeof d.amount === 'number' ? d.amount : 'n/a'} currency=${clean(d.currency)} plan_code_present=${planCodeOf(d) ? 'yes' : 'no'}`,
  )
}

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

  if (!(await claimPayment(supabaseAdmin, user.id, args.reference, args.plan, args.amount))) {
    logIgnored('duplicate_reference', 'grant', { reference: args.reference, amount: args.amount })
    return ok() // duplicate delivery
  }

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
    console.warn(`[paystack-webhook] rejected reason=invalid_signature signature_header=${sig ? 'present' : 'missing'}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(body)
  } catch {
    logIgnored('unparseable_body', 'unknown')
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
      if (!customerEmail || !subscriptionCode) {
        logIgnored(!customerEmail ? 'no_customer_email' : 'no_subscription_code', event.event, data)
        return ok()
      }

      const resolved = resolvePlan(planCodeOf(data), customerEmail)
      if (!resolved) {
        logIgnored(planCodeOf(data) ? 'plan_code_not_recognised_or_not_allowed' : 'no_plan_code', event.event, data)
        return ok()
      }

      const planObj = planObjectOf(data)
      if (!priceMatches(resolved.priceKey, planObj?.currency, planObj?.amount)) {
        const detail = ['plan', resolved.priceKey, 'currency', String(planObj?.currency), 'amount', String(planObj?.amount)]
        if (priceCheckEnforced()) {
          console.error('[webhook] subscription.create price mismatch, nothing granted.', ...detail)
          logIgnored('price_mismatch', event.event, data)
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
      if (!customerEmail || !reference) {
        logIgnored(!customerEmail ? 'no_customer_email' : 'no_reference', event.event, data)
        return ok()
      }

      // A reference WE created (CHECKOUT_V2, one-time checkout): the stored intent decides the tier and the price, never the event's plan
      // details (a bank-transfer or USSD payment carries none). Not found, or the intents table not created yet: the plan-code path below.
      const looked = await findIntent(reference)
      if (looked.kind === 'found') {
        const intent = looked.intent
        const confirmed =
          data.status === 'success' &&
          typeof data.amount === 'number' && data.amount === intent.amount_kobo &&
          typeof data.currency === 'string' && data.currency.toUpperCase() === intent.currency
        let payerIsOwner = metadata.user_id === intent.user_id
        if (!payerIsOwner) {
          const { data: owner, error: ownerErr } = await supabaseAdmin.from('users').select('email').eq('id', intent.user_id).maybeSingle()
          check(ownerErr, 'intent user lookup')
          payerIsOwner = !!owner?.email && String(owner.email).toLowerCase() === customerEmail.toLowerCase()
        }
        if (!confirmed || !payerIsOwner) {
          logIgnored('intent_mismatch', event.event, data)
          return ok()
        }
        await grantIntent(supabaseAdmin, intent)
        return ok()
      }

      // Not a plan transaction (or unknown plan) → nothing to grant
      const resolved = resolvePlan(planCodeOf(data), customerEmail)
      if (!resolved) {
        logIgnored(planCodeOf(data) ? 'plan_code_not_recognised_or_not_allowed' : 'no_plan_code', event.event, data)
        return ok()
      }

      if (!priceMatches(resolved.priceKey, data.currency, data.amount)) {
        const detail = ['reference', reference, 'plan', resolved.priceKey, 'currency', String(data.currency), 'amount', String(data.amount)]
        if (priceCheckEnforced()) {
          console.error('[webhook] charge.success price mismatch, nothing granted.', ...detail)
          logIgnored('price_mismatch', event.event, data)
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
      if (!txRef) {
        logIgnored('no_transaction_reference', event.event, data)
        return ok()
      }

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
      if (payment.refunded_at) {
        logIgnored('refund_already_processed', event.event, data)
        return ok() // duplicate delivery
      }

      const refunded = Number(data.amount)
      if (!Number.isFinite(refunded) || refunded < Number(payment.amount_cents)) {
        console.error('[webhook] partial or unreadable refund; access NOT revoked, review by hand. reference', txRef)
        return ok()
      }

      // revoke first, mark second: a failure in between leaves refunded_at null, so the retry runs it again
      await revokeEntitlement(supabaseAdmin, payment.user_id)
      const { error: markErr } = await supabaseAdmin.from('payments').update({ refunded_at: new Date().toISOString() }).eq('id', payment.id)
      check(markErr, 'payment mark refunded')
      try {
        await supabaseAdmin.from('payment_intents').update({ status: 'refunded' }).eq('reference', txRef) // bookkeeping only
      } catch {
        // the intents table may not exist
      }

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

  // reached only by event types we do not handle (every handled type returns above)
  logIgnored('unhandled_event_type', event.event, event.data)
  return ok()
}
