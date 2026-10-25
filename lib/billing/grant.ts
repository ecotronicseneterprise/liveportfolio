// Shared grant helpers for the Paystack webhook, the checkout return page and (later) renewals. Moved out of the webhook route UNCHANGED
// (apart from the optional `stackYear` mode in applyEntitlement, which only the one-time checkout uses); the webhook's existing tests cover them.
// Server only: it uses the service role. Nothing here is imported by a client component.
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { sendEmail, emailTemplates } from '@/lib/email'

export type Plan = 'basic' | 'pro'
export type Admin = ReturnType<typeof getSupabaseAdmin>
export type PgError = { message: string; code?: string } | null

export const YEAR_MS = 365 * 24 * 60 * 60 * 1000
export const RENEWAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

// A failure that must make Paystack retry (the handler answers 500). Everything else answers 200.
export class Retryable extends Error {}
export function check(error: PgError, what: string): void {
  if (error) throw new Retryable(`${what}: ${error.message}`)
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
export async function applyEntitlement(
  supabaseAdmin: Admin,
  userId: string,
  plan: Plan,
  opts: { absoluteExpiry?: Date; grantOnly?: boolean; keepHigher?: boolean } = {},
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

  // one-time checkout: a Basic payment must never downgrade a running Pro plan (the payment is still recorded and the time still added)
  if (opts.keepHigher && current?.plan === 'pro' && plan === 'basic') plan = 'pro'

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
export async function revokeEntitlement(supabaseAdmin: Admin, userId: string) {
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
export async function claimPayment(
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

export async function releasePayment(supabaseAdmin: Admin, reference: string) {
  const { error } = await supabaseAdmin.from('payments').delete().eq('ls_order_id', reference)
  // If this fails the retry will see a "duplicate" and skip a payment that was never applied: reconcile it by hand.
  if (error) console.error('[webhook] RECONCILE BY HAND: could not release payment claim after a failed grant. reference', reference, 'error', error.message)
}

export async function notifyLive(user: { email: string; slug: string }) {
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

// ─── One-time checkout grant ─────────────────────────────────────────────────────────────────────────────
// Used by BOTH the webhook (charge.success for a reference we created) and the return-page verify, so whichever arrives first grants and
// the other finds the work done. Idempotent: claimPayment is the lock. The new expiry is decided ONCE and stored on the intent
// (granted_expires_at) before anything is changed, so a retry after a partial failure re-applies the same date instead of stacking
// another year. users.plan_expires_at is deliberately NOT set: refunds must be able to revoke (see revokeEntitlement) and the
// subscription row is the source of truth for paid plans.
export type GrantIntentResult = 'applied' | 'renewed' | 'duplicate' | 'no_user'

type IntentForGrant = { id: string; user_id: string; tier: 'basic' | 'pro' | 'test'; amount_kobo: number; reference: string; granted_expires_at?: string | null }

export async function grantIntent(supabaseAdmin: Admin, intent: IntentForGrant): Promise<GrantIntentResult> {
  const plan: Plan = intent.tier === 'pro' ? 'pro' : 'basic'

  const { data: userRow, error: userErr } = await supabaseAdmin.from('users').select('id, email, slug').eq('id', intent.user_id).maybeSingle()
  check(userErr, 'user lookup (intent)')
  const user = userRow as { id: string; email: string; slug: string } | null
  if (!user) {
    console.error('[billing] RECONCILE BY HAND: a paid checkout has no user row. reference', intent.reference)
    return 'no_user'
  }

  // 1) decide the expiry once
  let target = intent.granted_expires_at ?? null
  if (!target) {
    const { data: cur, error: curErr } = await supabaseAdmin
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    check(curErr, 'subscription lookup (intent)')
    const now = Date.now()
    const curExpiry = cur?.expires_at ? new Date(cur.expires_at as string).getTime() : 0
    target = new Date(Math.max(curExpiry, now) + YEAR_MS).toISOString()
    const { error: setErr } = await supabaseAdmin.from('payment_intents').update({ granted_expires_at: target }).eq('id', intent.id).is('granted_expires_at', null)
    check(setErr, 'intent expiry')
    // another delivery may have decided first: use the stored value so every attempt agrees
    const { data: stored, error: reErr } = await supabaseAdmin.from('payment_intents').select('granted_expires_at').eq('id', intent.id).maybeSingle()
    check(reErr, 'intent expiry (reread)')
    if (stored?.granted_expires_at) target = stored.granted_expires_at as string
  }

  // 2) claim, then apply
  if (!(await claimPayment(supabaseAdmin, user.id, intent.reference, plan, intent.amount_kobo))) {
    await supabaseAdmin.from('payment_intents').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', intent.id).neq('status', 'refunded')
    return 'duplicate'
  }
  let result: 'applied' | 'renewed' | 'skipped'
  try {
    result = await applyEntitlement(supabaseAdmin, user.id, plan, { absoluteExpiry: new Date(target), keepHigher: true })
  } catch (err) {
    await releasePayment(supabaseAdmin, intent.reference)
    throw err
  }

  await supabaseAdmin.from('payment_intents').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', intent.id)
  revalidatePath(`/portfolio/${user.slug}`)
  revalidatePath(`/${user.slug}`)
  if (result === 'applied') await notifyLive(user)
  return result === 'skipped' ? 'renewed' : result
}
