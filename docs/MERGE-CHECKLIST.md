# Merge checklist: `dev` to `main` (one-time checkout, no flag)

## Pro-template release checks (2026-10-25; shipped in the same release, run these after it is live)

- Review [Pro template validation](pro-template-validation.md), including the unmet 90+ Lighthouse mobile target; do not mark that gate passed.
- Confirm all seven designs visually. Existing portfolios keep their original design except for separately documented correctness fixes.
- Verify on an owner-controlled account: preview does not save; explicit design save survives reload; the public renderer agrees; History restores; stale tabs receive 409. A Basic/free account must not save a new Pro opt-in.
- No new SQL or production environment variable is required for the redesign. Existing JSONB/revision storage is used. Local `NEXT_BUILD_DIR` and `TEMPLATE_REVIEW_URL` must not be copied into Vercel.
- Verify owner admin access using the configured, verified `PAYSTACK_TEST_EMAIL` account; a nonempty `ADMIN_EMAILS` list overrides it.
- Keep the live billing tests below separate; synthetic template validation does not replace them.

**What this merge changes for customers:** buying a plan now goes through our server (`POST /api/checkout`), then Paystack's page, then `/checkout/return`. The old card-subscription checkout is no longer offered. If checkout cannot start, the person sees a message with the support address; there is no fallback.
**It also ships** openai 7, zod 4, webhook logging of ignored events, a Plan and billing panel in the dashboard, Naira prices with a labelled dollar estimate, and a real 7-day refund guarantee in the Terms.

## 1. Before you merge: SQL (run in the Supabase SQL editor, in this order)

1. Confirm the earlier tables exist (each must be non-null):
   ```sql
   select to_regclass('public.usage_events') as usage_events,
          to_regclass('public.portfolio_revisions') as portfolio_revisions,
          to_regclass('public.payment_intents') as payment_intents;
   ```
   If `usage_events` or `portfolio_revisions` is null, run `supabase/manual/20261025110000_usage_events.sql` and `supabase/manual/20261026100000_portfolio_revisions.sql` first.
2. **Run `supabase/manual/20261026110000_payment_intents.sql`** (the file contents are in the reply that sent you here and in the repo). Without this table the new checkout answers 503 and nobody can pay.
3. Verify (expect `true`, rows only for `service_role`, and `0`):
   ```sql
   select relrowsecurity from pg_class where oid = 'public.payment_intents'::regclass;
   select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'payment_intents' order by 1, 2;
   select count(*) from pg_policies where tablename = 'payment_intents';
   ```
   Rollback if ever needed: `supabase/rollbacks/20261026110000_payment_intents.rollback.sql` (drops only this table).

## 2. Before you merge: settings that must be true

Vercel, Production (names only, values are yours to check; nothing new is required, all of these already exist):
- `PAYSTACK_SECRET_KEY` is the **live** key (`sk_live_...`), the same account as the live public key.
- `PAYSTACK_TEST_EMAIL` is **exactly** the e-mail of the account you will test with (use a real mailbox you can read, a plus-address is fine). The 500 Naira test is refused for every other account.
- `NEXT_PUBLIC_APP_URL` is `https://liveportfolio.site` (it builds Paystack's return address).
- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL` exist.
- Optional cleanup after the merge: delete `NEXT_PUBLIC_META_PIXEL_ID` (unused).

Paystack dashboard (Live mode):
- Settings, API Keys and Webhooks: the webhook URL is `https://liveportfolio.site/api/paystack-webhook` and starts with `https://`. The Live Callback URL can stay empty (we send our own).
- Settings, Preferences: note which payment channels are enabled (card, bank transfer, USSD, QR). What a customer can pick depends on this.
- The account is activated and a settlement bank account is set.
- The old **Test 500** subscription (₦500 monthly) is cancelled, or it charges you again around Nov 12.

Support: `ecotronics.nterprise@gmail.com` is the address shown in the Terms, privacy policy, return page and dashboard. **Confirm that mailbox exists and you read it**, because refund requests go there.

## 3. Create the PR and merge

Test the Vercel `dev` preview before merging. Open `https://github.com/ecotronicseneterprise/liveportfolio/compare/main...dev` and **Create a merge commit** (not squash, so one revert undoes it). GitHub CI runs only on pushes to `main`, including merges; it does not run on `dev` pushes or pull requests. After merging, check both the CI result and the Production deployment's Ready status. Vercel deploys independently of CI, so a failed check does not automatically stop deployment. If branch protection requires the old pre-merge `verify` check, update that requirement explicitly in GitHub settings.

## 4. The first five things to test on the live link (private browser window)

1. **Right build.** `https://liveportfolio.site/api/flags` shows `"commit"` equal to the merge commit. *Expected:* it matches; `env` is `production`.
2. **Plan and billing, in Naira.** Log in, open Dashboard, Account tab. *Expected:* a "Plan and billing" card (Free plan, "Publish my portfolio"); clicking it opens a modal showing **₦15,000 for 12 months** and **₦45,000 for 12 months**, the footer "One payment for 12 months · No automatic renewal · 7-day refund guarantee", and no "/year" or dollar-only price. At 390px it fits with no sideways scrolling. `/terms` section 5 says one payment, no automatic renewal; section 6 says 7-day guarantee.
3. **The 500 Naira owner test.** Logged in as the `PAYSTACK_TEST_EMAIL` account, open `https://liveportfolio.site/dashboard?test=1`, open the modal, click "[TEST] Pay ₦500". *Expected:* Paystack's page opens with the payment options your account has; pay; you return to `/checkout/return`, which says "Payment received", Basic active until about 12 months from today, within a minute. Dashboard badge says Basic. Check with SQL (replace the e-mail):
   ```sql
   select plan, published_at, plan_expires_at from public.users where lower(email) = lower('YOUR_TEST_EMAIL');
   select plan, status, expires_at from public.subscriptions where user_id = (select id from public.users where lower(email) = lower('YOUR_TEST_EMAIL'));
   select ls_order_id, product_tier, amount_cents, refunded_at from public.payments where user_id = (select id from public.users where lower(email) = lower('YOUR_TEST_EMAIL'));
   select tier, amount_kobo, status, paid_at from public.payment_intents where user_id = (select id from public.users where lower(email) = lower('YOUR_TEST_EMAIL')) order by created_at desc limit 3;
   ```
   *Expected:* `users.plan = basic`, `plan_expires_at` empty; one `subscriptions` row `basic / active` ending in about 12 months; one `payments` row with a reference starting `lpi_`, `product_tier basic`, `amount_cents 50000`, `refunded_at` empty; the newest intent `test / 50000 / paid`. Then **refund** it in Paystack and re-run: `payments.refunded_at` set, `subscriptions.status = expired`, `users.plan = unpublished`, intent `refunded`. Also: from any other account, `?test=1` then the test button shows "only for the account owner".
4. **Your own ₦15,000 Basic payment** on a fresh account (real mailbox, no `?test=1`). *Expected:* same as test 3 with `amount_cents 1500000`, `tier basic`; logged out, `https://liveportfolio.site/<your-slug>` shows the live portfolio. Write down what payment options Paystack offered (card only, or also transfer or USSD).
5. **Refund path and logs.** Refund that payment in Paystack. *Expected:* the plan reverts to `unpublished` and the public page goes offline (404). In Vercel logs for `/api/paystack-webhook`, search `[paystack-webhook] ignored`: there should be no unexpected `reason=` lines (a `duplicate_reference` line right after a successful payment is normal: the return page and the webhook both ran).

**Do not give anyone a payment link until tests 3 and 4 both pass.**

## 5. If something fails

- **Anything wrong with the live site:** Vercel, Deployments, previous deployment, Instant Rollback. (It restores the code, not environment values or the database.)
- **A customer paid but has no plan:** check `payment_intents` for their reference and the webhook logs; the manual grant SQL (dry run, grant, rollback) is in `docs/payment-redesign.md` section 2.7.
- **Checkout answers "Payment could not be started":** check that `payment_intents` exists (section 1) and that `PAYSTACK_SECRET_KEY` is the live key; the logs say `[checkout] payment_intents is not available` or `Paystack initialize failed`.
