# Payment redesign (Phase 1: investigation and design only)

Written 2026-10-24 against `dev` = `d2e2de2`. No code, env var, SQL or Paystack setting was changed for this document. Evidence is marked **verified** (read in this repo or on the live site today), **secondary** (a search summary of Paystack's docs or a third-party page; the Paystack docs site itself returned HTTP 403 to my fetcher, so I could not read it directly) or **unverified** (not checkable from here: needs your Paystack dashboard or a live test).

## 0. What the facts say

- **The Oct 5 ₦45,000 was abandoned**, not paid (you checked Paystack). Nobody is owed access. The earlier one-user grant SQL must not be run for that account.
- **Two people tried to pay and failed** (one abandoned ₦45,000, one tried ₦15,000 four times). The cause is not yet known. Open each transaction in Paystack (Transactions, filter Failed and Abandoned) and note the message: declined, invalid OTP, insufficient funds, 3-D Secure not completed, or never opened. That decides how much of the loss is the checkout and how much is the bank.
- **The checkout passes a plan code** and no amount or currency (**verified**, `components/UpgradeModal.tsx`): `PaystackPop.setup({ key, email, plan, ref: 'lp-<portfolio>-<tier>-<ts>', metadata })`. So Paystack charges the plan's own amount and creates a **subscription**.
- **Paystack on plans** (**secondary**): attaching a plan code to an initialize call "will override the transaction amount passed, and charge the customer the amount of the plan instead". Recurring billing is documented for **card and direct debit (Nigeria) only**; USSD, bank transfer and mobile money are **not documented as recurring channels**. Whether a plan code also **hides** non-card channels at checkout is **not stated** in what I could read: **unverified**. Your Paystack transaction list shows only "Card".
- **Paystack on channels** (**secondary**): `channels` is optional and restricts what Checkout offers; documented values are `card`, `bank`, `ussd`, `qr`, `mobile_money`, `bank_transfer`, `eft` (and newer ones such as `apple_pay`, `capitec_pay`). If omitted, Checkout offers the channels **enabled on your integration** (stated by a third-party SDK, not by Paystack: verify in the dashboard). Which of USSD, bank transfer, QR and mobile money your account type has is **unverified**: Paystack dashboard, Settings, Preferences / Payment channels.
- **Verify before giving value** (**secondary**): `GET /transaction/verify/:reference`; check `data.status === 'success'` (the top-level `status` is the API call, not the payment), and confirm amount, currency and reference match your order.
- **Webhook sender IPs** (**secondary**): `52.31.139.75`, `52.49.173.169`, `52.214.14.220`. Our webhook verifies the HMAC-SHA512 signature only (**verified**); an IP allow-list is an optional second layer (design below). The retry policy is **unverified** (not found).
- **Today's webhook silently ignores a `charge.success` without a plan code** (**verified**). A bank-transfer or USSD payment that arrives without plan details would take money and grant nothing. As of `d2e2de2` every such drop is logged (reason `no_plan_code`), but it is still not granted. The redesign removes the dependence.
- **Current Production state for plan codes** (**verified** from the live client bundle): Basic `PLN_xsu4j4jyxo67pe1`, Pro `PLN_npgms123sd8z2jc`, Test `PLN_gzi13ks4vajcdhx`; the server-side variables are Sensitive and **unverified**. Nothing in the repo or client references the old ₦5,000 plan `PLN_mt7x7iubs57tgl0`.
- **₦500 Test plan** is monthly with one active subscription, so it will charge you again around Nov 12 unless cancelled in Paystack (your note).

## 1. The design in one picture

```
Browser (signed in)                Our server                               Paystack
  click "Publish with Basic"
        └── POST /api/checkout {tier} ──► price + tier from OUR table
                                          insert payment_intents(pending)
                                          POST /transaction/initialize ───► (amount, ref, callback, NO channels, NO plan)
        ◄── authorization_url ◄───────────                              ◄── authorization_url, access_code
  redirect to Paystack (all enabled channels)
  pay (card / transfer / USSD / QR ...)
        └──────────────────────────────────────────────────────────────► charge.success ──► POST /api/paystack-webhook
                                          webhook: reference in payment_intents? amount, currency, user match?
                                          grantIntent() ──► payments row (claimPayment) + subscription (12 months) + users.plan
  Paystack redirects to /checkout/return?reference=...
        └── POST /api/checkout/verify {reference}
                                          GET /transaction/verify/:ref ──► status, amount, currency
                                          grantIntent() (same function, idempotent)  ──► "You're live"
```
Two independent paths (webhook and return page) call the **same** idempotent function, so a late webhook does not delay access and a missed return does not lose a payment.

## 2. Parts

### 2.1 Prices and intents (server owns the price)
- **Files:** new `lib/billing/prices.ts` (`PRICES = { basic: 1_500_000, pro: 4_500_000, test: 50_000 }` in kobo, currency `NGN`; `lib/plans.ts` already holds `priceNgn` for display and a test asserts the two agree), `lib/billing/intents.ts`, `app/api/checkout/route.ts`.
- **Rules:** authenticated by the verified user id only (`getUserFromRequest`); tier must be `basic` or `pro`; `test` only when the account e-mail equals `PAYSTACK_TEST_EMAIL` (case-insensitive) **and** the request came from the owner-only test UI; the client never sends an amount, currency, reference or e-mail. Reference is server generated (`lpi_` plus 24 URL-safe random characters), stored before the Paystack call. At most 10 intents per user per hour (counted in `payment_intents`, so no new `usage_events` kind). Intents expire after 24 hours.
- **Upgrade Basic to Pro:** v1 charges the full Pro price and sets the expiry 12 months from the later of now and the current expiry. A pro-rated credit is a later option. **Owner decision needed** (open question 3).
- **Migration** `supabase/manual/<ts>_payment_intents.sql` (additive; RLS on and browser roles revoked in the same file; rollback in `supabase/rollbacks/`):
```sql
create table if not exists public.payment_intents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  tier         text not null check (tier in ('basic','pro','test')),
  amount_kobo  integer not null check (amount_kobo > 0),
  currency     text not null default 'NGN' check (currency = 'NGN'),
  reference    text not null unique,
  status       text not null default 'pending' check (status in ('pending','paid','failed','expired','refunded','cancelled')),
  access_code  text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '24 hours',
  paid_at      timestamptz,
  followup_sent_at timestamptz
);
create index if not exists payment_intents_user_created_idx on public.payment_intents (user_id, created_at desc);
alter table public.payment_intents enable row level security;
revoke all on table public.payment_intents from anon, authenticated;
grant select, insert, update, delete on table public.payment_intents to service_role;
```
- **Risks:** a failed Paystack initialize leaves a `pending` intent (swept by expiry; harmless). Price-table drift from the Paystack dashboard cannot happen because there is no dashboard plan any more (**verified**: the intent route carries its own amount). **Tests:** unauthenticated 401; a tampered body (amount, currency, email, `userId`) ignored; unknown tier 400; `test` refused for another e-mail; rate limit; the Paystack call is made without `plan` and without `channels` (assert on the mocked fetch); reference never reused. **Rollback:** feature flag off, then drop the table. **Effort:** 0.5 to 1 day.

### 2.2 Initialize and redirect
- **Call:** `POST https://api.paystack.co/transaction/initialize` with `{ email, amount, currency: 'NGN', reference, callback_url: <APP_URL>/checkout/return, metadata: { user_id, tier, intent: <id> } }`. **No `channels` and no `plan`** (so the full enabled set shows and no subscription is created). Timeout 8 s; any non-success returns a clear 502 and marks the intent `failed`.
- **UI:** redirect to `authorization_url` (works on every phone browser, no iframe or `X-Frame-Options` dependency). The inline popup via `access_code` is an alternative; I recommend the redirect for reliability (**secondary**: not tested here).
- **Risk:** which channels appear is decided by your account settings (**unverified**), not by our code. The fallback remains a bank transfer to you and a manual grant (section 2.7).

### 2.3 Webhook: trust only intents we created
- In `app/api/paystack-webhook/route.ts`, `charge.success` first looks the reference up in `payment_intents`:
  - **Found:** require `data.status === 'success'`; amount equals `amount_kobo`; currency `NGN`; `metadata.user_id` equals the intent's user **or** the payer e-mail equals that user's e-mail (never trust the metadata alone, as today); then `grantIntent`.
  - **Not found:** fall through to today's plan-code path unchanged (keeps the Test 500 subscription and any renewal working).
- **`grantIntent(intent)`** (extracted from the current `grant`/`claimPayment`/`applyEntitlement` into `lib/billing/grant.ts`; the existing webhook tests must stay green untouched): `claimPayment` (inserts `payments`, unique reference = the idempotency lock) then `subscriptions` row with `expires_at = max(current expiry, paid_at) + 12 months`, `users.plan`, `published_at`, intent `paid`, revalidate pages, one "you're live" e-mail only on first activation.
- **Do not set `users.plan_expires_at` for paid plans** (this deviates from your sketch, on purpose, **verified in code**): `revokeEntitlement` returns early when `plan_expires_at` is in the future ("a separate time-boxed plan is still running"), so a refund of a one-time payment would **not** take access away. The subscription row stays the single source of truth, exactly as for plan payments today; the nightly cron already downgrades after expiry plus 3 days of grace.
- **Optional hardening (design only):** reject webhook requests whose source IP is not one of Paystack's three published addresses, behind a flag (default off), because behind Vercel the client IP header would have to be trusted (**unverified**); and call verify inside the webhook as well.
- **Tests:** intent found and valid grants once; duplicate delivery grants once; amount, currency or user mismatch grants nothing and is logged; intent expired or another user's reference grants nothing; unknown reference still takes the legacy path; bad signature 400; webhook and return page racing produce one payment row and one subscription. **Rollback:** flag off, redeploy (the legacy path is untouched). **Effort:** 1 to 1.5 days (the refactor is the careful part).

### 2.4 Return page and verify
- **Files:** `app/checkout/return/page.tsx` (client; shows "Confirming your payment" and polls up to about 60 s, then offers "Check again" and "Contact support" with the reference), `app/api/checkout/verify/route.ts`.
- **Route:** authenticated; the reference must belong to the caller's own intent (another user's reference is a 404); calls Paystack verify with the secret key; requires `data.status === 'success'`, amount and currency equal to the intent, `data.reference` equal; then `grantIntent`. Returns `{ plan, expires_at }` or `{ pending: true }` while Paystack still reports `ongoing` or `pending`; `abandoned` and `failed` mark the intent and say so plainly.
- **Risks:** Paystack verify outage (we return pending; the webhook still grants); a user without a session on return (redirect to sign-in, then back with the reference). **Tests:** mocked Paystack fetch for success, failed, abandoned, ongoing, mismatched amount, network error and timeout. **Effort:** 0.5 to 1 day.

### 2.5 Keep the old path, and the owner-only ₦500 test
- The plan-code branch of the webhook stays as it is for the existing Test subscription and any renewal. The modal no longer passes a plan code when the flag is on, so no new subscription is created.
- The ₦500 test becomes an intent with `tier: 'test'`, refused by the server unless the account e-mail equals `PAYSTACK_TEST_EMAIL`; grants Basic for 12 months; refund reverses it. The `?test=1` button stays hidden from everyone else (and is useless to them: the server refuses).
- **Flag:** `CHECKOUT_V2` (server) and `NEXT_PUBLIC_CHECKOUT_V2` (UI), both default off. Off means today's behaviour exactly.

### 2.6 Refunds and expiry for one-time payments
- `refund.processed` already works for any `payments.ls_order_id` (**verified**): a full refund revokes the subscription and plan and stamps `refunded_at`; a partial refund is logged for a human. Add: set the intent to `refunded`. No Paystack subscription exists for intent payments, so there is nothing to cancel (unlike the Test plan today).
- **Expiry:** the existing nightly job already expires subscriptions 3 days after `expires_at`. Because there is no auto-renewal any more, **the 12-month end is a hard end**: portfolio unpublished unless renewed.
- **Renewal reminders (design only):** the daily cron already sends one reminder 30 days before expiry (`app/api/cron/drip/route.ts`, Flow C; **verified**). Add a second at 7 days and a "last day" notice; reword all three from "renews" to "ends", with one-click "Renew" that starts a normal intent. Renewing early extends from the current expiry, never shortens it.
- **Tests:** refund reverses a one-time grant; partial refund logged; reminder dedupe keys per period; wording contains "ends", never "renews automatically".

### 2.7 Manual grant for a bank-transfer payer (not run)
Use only after you have seen the money arrive. Edit the three values at the top. The reference is a manual one so it cannot collide with Paystack's; the unique `payments.ls_order_id` makes it idempotent.
```sql
-- 0) EDIT THESE THREE (tier is 'basic' or 'pro'; amount in kobo: 1500000 or 4500000; paid_at is when YOU received the transfer)
--    email: lower-case address of the account that paid
\set email  'someone@example.com'
\set tier   'pro'
\set amount 4500000
-- (If your SQL editor does not support \set, paste the literals into the three places marked <<EDIT>> below.)

-- 1) DRY RUN (read-only): the user must exist; no active subscription should exist; no payment should be recorded for the reference
select id, email, slug, plan, published_at from public.users where lower(email) = lower(:'email');
select plan, status, expires_at from public.subscriptions where user_id = (select id from public.users where lower(email) = lower(:'email'));
select * from public.payments where ls_order_id = 'manual-' || to_char(now(), 'YYYYMMDD') || '-' || substr((select id::text from public.users where lower(email) = lower(:'email')), 1, 8);

-- 2) GRANT (one transaction)
begin;
with u as (select id from public.users where lower(email) = lower(:'email')),
pay as (
  insert into public.payments (user_id, ls_order_id, product_tier, amount_cents)
  select u.id, 'manual-' || to_char(now(), 'YYYYMMDD') || '-' || substr(u.id::text, 1, 8), :'tier', :amount from u
  on conflict (ls_order_id) do nothing returning user_id
),
sub as (
  insert into public.subscriptions (user_id, plan, status, started_at, expires_at)
  select user_id, :'tier', 'active', now(), now() + interval '12 months' from pay returning user_id
)
update public.users set plan = :'tier', published_at = coalesce(published_at, now()) where id in (select user_id from sub);
commit;

-- 3) VERIFY: plan = tier, one active subscription ending in 12 months, one payment
select plan, published_at from public.users where lower(email) = lower(:'email');
select plan, status, expires_at from public.subscriptions where user_id = (select id from public.users where lower(email) = lower(:'email')) order by created_at desc limit 1;

-- ROLLBACK (undoes this grant only; put back the plan you recorded in step 1)
-- begin;
-- delete from public.subscriptions where user_id = (select id from public.users where lower(email) = lower(:'email')) and plan = :'tier' and started_at > now() - interval '1 day';
-- delete from public.payments where ls_order_id like 'manual-' || to_char(now(), 'YYYYMMDD') || '-%' and user_id = (select id from public.users where lower(email) = lower(:'email'));
-- update public.users set plan = 'unpublished' where lower(email) = lower(:'email');
-- commit;
```
Note: the Supabase SQL editor may not accept `\set` (a `psql` feature). If it does not, replace `:'email'`, `:'tier'`, `:amount` with literals; I will produce a literal version for the specific person when the time comes.

### 2.8 Abandoned-checkout follow-up (design only)
- A daily cron (the project already has four daily crons in `vercel.json`) finds intents `pending` for 2 to 26 hours with no payment and no earlier follow-up, and sends **one** service e-mail: "You started checkout for Basic. If something went wrong, reply and we will help, or pay by bank transfer." No discount, no marketing language, no second send (`followup_sent_at`). Skip if the user has since paid or the intent is expired.
- **Legal:** whether this counts as transactional or marketing varies by region (**unverified**; add to `docs/legal-review.md`). A daily cadence means the nudge arrives the next day, not within the hour; hourly would need a plan with sub-daily crons (**unverified** for your Vercel plan).
- **Tests:** one e-mail per intent, never after payment, never for expired intents, wording check. **Effort:** 0.5 day.

### 2.9 Display: ₦ everywhere, USD only as an estimate
- Today outside Nigeria the modal shows a USD figure computed from a live rate (about $10 and $30; `hooks/useUsdRate.ts`) but Paystack charges the plan amount in NGN (**verified**); the Terms say all charges are in NGN and give "approx. $10" and "$30".
- **Change:** show **₦15,000 and ₦45,000 to everyone**, and for international visitors add the small line "about $X at today's rate. You are charged in Naira and your bank converts it." The figure comes from the same rate hook, labelled approximate, never presented as the price. Prices come from one table (`lib/plans.ts`), and a test asserts the modal, `PricingSection`, the Terms text and the intent price table agree.
- **Files:** `components/UpgradeModal.tsx`, `components/PricingSection.tsx`. **Effort:** 0.5 day.

### 2.10 Copy for refunds and terms (matches `app/terms/page.tsx`)
The Terms (verified) say: refund requests within 7 days; generally approved if you have **not yet published**; once published "refunds may not apply"; cancel any time and the portfolio stays live to the end of the period; everything charged in NGN. Places that go further than that:
- `components/UpgradeModal.tsx:228` "Annual billing · 7-day refund guarantee · Cancel anytime"
- `app/page.tsx:445` "7-day refund if you publish and change your mind"
- `components/PricingSection.tsx:125` "Refunds reviewed within 7 days of purchase · Cancel anytime" (closest to the Terms)
- `app/free-portfolio-website/page.tsx:32` "plans can be cancelled anytime. See the pricing page for the current refund window."

**Proposed text** (honest, and consistent with one-time annual payments):
- Modal and pricing line: "12 months of access, one payment. Refund requests within 7 days are reviewed." (no "guarantee", no "cancel anytime": there is nothing to cancel with a one-time payment.)
- Landing: "Free to build and preview. No card needed. Pay once for 12 months. Refund requests within 7 days are reviewed."
- FAQ: "You pay once for 12 months. There is no automatic renewal; we email you before it ends."
- Terms section 5 changes from "renew automatically unless cancelled / you may cancel" to "billed once for 12 months, no automatic renewal". **Owner decision**: if you prefer a real 7-day money-back guarantee, change the Terms section 6 instead and keep "guarantee" in the UI.
- All of this text is for your and a lawyer's review (`docs/legal-review.md`).

## 3. Order of work, estimates, rollback
1. Merge the logging commit (`d2e2de2`) so ignored events are visible. 2. `payment_intents` migration (you run it). 3. Extract `grantIntent` and add the webhook intent branch (tests first; legacy tests untouched). 4. `/api/checkout`, `/api/checkout/verify`, return page. 5. Modal behind `CHECKOUT_V2` (off). 6. Copy and display fixes. 7. Owner-only ₦500 live test of the new flow on the `git-dev` preview (it shares live Paystack keys), then Basic for real. 8. Reminders and abandoned follow-up.

| Part | Effort | Rollback |
|---|---|---|
| Intents + checkout route | 0.5 to 1 day | flag off; drop table |
| Webhook intent branch + grantIntent extraction | 1 to 1.5 days | flag off; legacy path untouched |
| Return page + verify | 0.5 to 1 day | flag off |
| Modal, display, copy | 1 day | revert commit |
| Reminders, follow-up | 1 day | remove cron lines |
| **Total** | **about 4 to 5.5 days** with tests and a real-browser run | each part independently |

**Risks that stay open after the redesign:** which payment channels your account has (unverified: dashboard); whether the failures are bank or card issues (unverified until you read the failed transactions); recurring auto-renew is gone by design (renewal is manual until it is rebuilt on Paystack's card authorization, which only works for cards); international cards may be disabled on your account (unverified).

## 4. What I need from you
1. In Paystack: the failure message for each failed or abandoned transaction; Settings, Preferences: which channels are enabled; whether international cards are enabled.
2. Confirm the plan-code variables in Vercel (reveal the three server variables) match the three codes in section 0, then cancel the ₦500 monthly subscription.
3. Decide: full-price Pro for a Basic upgrade (my default) or pro-rated credit; the refund wording (honest text above, or a real guarantee with changed Terms); 12 months hard end with reminders (my default) or keep card auto-renew as an option later.
4. Approve this design, then say "build part 2.1 to 2.4".
