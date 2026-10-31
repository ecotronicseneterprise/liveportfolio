# Live status

Built from git and `vercel env ls` (names only; Vercel will not show Sensitive values), not from memory. **Update this file at every merge to `main`.**
Refresh with: `git fetch && git log --oneline --first-parent -5 origin/main && git log --oneline origin/main..origin/dev` and `vercel env ls production --project liveportfolio --scope cliffords-projects-0027534f`, then check `https://liveportfolio.site/api/flags` (its `commit` must equal the merge commit).

Last updated: 2026-10-31, when `main` was fast-forwarded to `dev` (`5a3ff4d`, Pro mobile editor cleanup). Both branches are synchronized, including this release note. The production deployment is triggered by the push; completion has not yet been verified. Compare `/api/flags`'s `commit` with `origin/main` before calling the release live. The older inventory below has not been fully re-audited.

## Latest merge: Pro mobile editor cleanup

- Phones and tablets below 1024px: keep one carousel, swipe/arrows to preview, and tap a small design card to select through the existing auto-save flow.
- Hide the duplicate mobile Preview tab, look-customiser preview and Pro-template buttons, and original/redesigned preview controls. Desktop and Free/Basic editors retain their existing controls.
- Validation: type-check, 20 focused unit tests and 3 isolated Chromium browser tests passed. Browser tests use synthetic content and mocked preview drawings; a signed-in production check is still needed.
- No migration, new environment variable or billing change. Rollback: revert the code change `5a3ff4d`.

## 1. What `main` (Production) contains today (everything below, including section 2 now merged)

1. **Account-first onboarding** (`/create/account` to `/create/generate`) with import from CV (PDF, DOCX), pasted text and a GitHub profile, behind a PII gateway; the model sees e-mail, phone and links as placeholders (`f0d32bc`, `74fece2`, `927b686`).
2. **Plans and entitlements**: Free (edit privately, 3 templates), Basic (publish), Pro (10 templates, analytics, QR, weekly score); template gallery with live preview (`ec5404c`, `6fd46db`).
3. **Original billing** (plan-code checkout through Paystack inline, subscription): webhook with price verification, claim-first idempotency, refunds, retries on database errors (`07f1dd1`, `cb5ad96`). **Never completed a real payment in live mode.**
4. **Security**: RLS closes browser writes to `users` and `portfolios`; `/api/email/welcome` authenticated; Next.js 15.5.28, sharp 0.35.5; image optimizer limited to our storage (`5b7f07f`, `0ff3282`, `269248d`).
5. **Dashboard**: free accounts can edit; avatar and name fixes; **History and undo** (typed operations, `portfolio_revisions`) (`5252847`, `5cbec98`, `d6d515d`).
6. **Onboarding polish**: restyle, project images, template picker, finished accounts land on the dashboard, sign-in for signed-out visitors, project optional (`acea1d4`, `cdd215e`, `f925c5c`, `50418e8`).
7. **LLM**: default `gpt-4o-mini`; `LLM_MODEL` switches model (not set in Production); the e-mail is never sent to OpenAI (`aac8069`).
8. **Privacy**: Google Analytics loads only after an explicit Accept, never on people's portfolios; Meta Pixel removed; privacy policy rewritten to match what is sent; **legal review still required** (`a27d825`).
9. **Operations**: `GET /api/flags` (commit and flag state per deployment) (`f76bcd4`); CI and `npm run verify` (`bcd6ae2`).
10. **Docs**: plans in `docs/` (`final-steps-plan.md`, `payment-redesign.md`, `agent-spike-plan.md`, `mcp-and-roadmap-plan.md`, `legal-review.md`).

Not on `main` and not built: the assistant, MCP, block catalog and new templates (design-lab only), email confirmation, Turnstile and social sign-in (code exists, switched off), renewal reminders for one-time plans.

## 1b. What the 2026-10-25 release added (merged `dev` into `main`; no SQL, no new required environment variables)

- **Free-user dashboard**: split editor with a live preview, a row of design tiles (Pro designs preview with a lock), and one Publish action.
- **Money**: refund is a *request* (the server checks the 7-day window, e-mails the support address, one request per payment); the owner refunds in Paystack and the existing webhook ends the plan. A refund of an older payment no longer ends a newer plan. Basic owners get "Upgrade to Pro", which opens the plan chooser with Pro only (normal full-price checkout). Checkout and grant code unchanged.
- **Cohort links** (bootcamps, universities): 6 months free through `/bootcamp/<code>`; dashboard countdown, a 12-step e-mail sequence (Flow D), expiry job no longer sets back someone who paid, no-SQL link creation. See [COHORT-ACCESS.md](COHORT-ACCESS.md).
- **`/admin`** (owner only): numbers, sign-ups, revenue, refund requests, cohort links. Access = the signed-in, e-mail-verified account listed in `ADMIN_EMAILS` (optional), otherwise `PAYSTACK_TEST_EMAIL`. No shared password.
- **Templates**: the three free templates (Creative, Minimal, Bold) draw with the block renderer for NEW portfolios; older portfolios and all seven Pro templates render as before. The public page drops non-http(s) links before drawing.
- **Landing page and pricing**: new hero copy, a browser-window sample of the three templates (invented person, own pictures, see [IMAGE-CREDITS.md](IMAGE-CREDITS.md)), equal-size pricing cards with coming-soon items under Pro.
- **Needs in Vercel** (names only): `PAYSTACK_TEST_EMAIL` = the owner's sign-in e-mail (already set); `ADMIN_EMAILS` optional. Needs existing tables `payment_intents` and column `payments.refunded_at` (present).
- **Pro templates**: correctness fixes for all seven (only real certificates shown, metrics and units kept as written, university jobs no longer dropped, headline, about and skills shown) and a redesigned version of each, chosen per portfolio in the dashboard (Design version, preview, Save; History can undo). Existing portfolios keep the original design until their owner saves a new one. The 90+ mobile Lighthouse target is not met (see [pro-template-validation.md](pro-template-validation.md)). New dev-only test tools: Playwright and axe (no effect on the shipped app).
- **Not in this release**: the AI agent.
- **Live tests, in order**: new account to the split dashboard; ₦15,000 Basic; request a refund (check the e-mail); ₦45,000 Pro; a cohort link on a throwaway account (steps in COHORT-ACCESS.md); open `/admin`.

## 2. What the previous release added (merged earlier)

- `27096f5` openai 4.104 to 7.43. `ccc2aed` zod 3.25 to 4.6.7 with the `ops.ts` patch-schema fix. `npm audit --omit=dev`: 0 vulnerabilities.
- `d2e2de2` the webhook logs every ignored or rejected event (`[paystack-webhook] ignored ...`).
- `430f8aa`, `597e31c` the **one-time checkout** (server-owned price, `payment_intents`, verify, return page). It is the ONLY way to buy a plan: no flag, no fallback. If `/api/checkout` or Paystack fails the modal shows a message with the support address. The webhook keeps the plan-code path for the one existing Test 500 subscription and renewals.
- Terms, pricing, landing, FAQ and modal: one payment for 12 months, no automatic renewal, 7-day refund guarantee. Prices in Naira with a labelled dollar estimate. Dashboard "Plan and billing" panel (`GET /api/billing`).
- `7a64288`, `8ac34c5` one public contact address (`ecotronics.nterprise@gmail.com`, `SUPPORT_EMAIL`); admin alerts and affiliate reports still go to the owner's personal address.
- Docs: `docs/payment-redesign.md`, `docs/MERGE-CHECKLIST.md`, this file.

**Not proven:** no payment has ever completed in live mode. Run the first five tests in `docs/MERGE-CHECKLIST.md` section 4 on the live link before giving anyone a payment link.

## 3. Production environment variable NAMES (values are Sensitive and cannot be read here)

| Class | Names | Notes |
|---|---|---|
| **Flags** (feature on/off) | `NEXT_PUBLIC_ONBOARDING_V2`, `NEXT_PUBLIC_IMPORT_ENABLED`, `IMPORT_ENABLED`, `REQUIRE_AUTH_FOR_LLM` | All on and effectively permanent. Remove the flags in a later cleanup, once payments are proven. `NEXT_PUBLIC_*` are baked at build time (redeploy without cache). |
| **Secrets** | `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `IPINFO_TOKEN`, `GITHUB_TOKEN`, `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `ADMIN_METRICS_SECRET` | Never in the repo or chat. `PAYSTACK_SECRET_KEY` must be the LIVE key matching the live public key. |
| **Configuration** | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_USD_TO_NGN_RATE`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `PAYSTACK_TEST_EMAIL` | `PAYSTACK_TEST_EMAIL` must equal the address of the account that runs the owner-only 500 Naira test. |
| **Public by design** | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Exposed to browsers. After the next merge no client code reads the Paystack public key; it can be removed later. |
| **Legacy plan-code path** (webhook only) | `PAYSTACK_BASIC_PLAN_CODE`, `PAYSTACK_PRO_PLAN_CODE`, `PAYSTACK_TEST_PLAN_CODE` | The webhook still recognises these so the existing Test 500 subscription and any renewals work. The `NEXT_PUBLIC_PAYSTACK_*_PLAN_CODE` twins are only a fallback for the same code; no client code reads them. |
| **Unused, safe to delete** | `NEXT_PUBLIC_META_PIXEL_ID` | The Meta Pixel was removed from the code. |

Absent on purpose (the code defaults apply): `LLM_MODEL` (default `gpt-4o-mini`), `NEXT_PUBLIC_SOCIAL_PROVIDERS` (social sign-in off), `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Turnstile off), `PAYSTACK_PRICE_CHECK` (the plan-code path only logs a price mismatch; the new checkout always enforces the stored price), `PAYSTACK_EXPECTED_PRICES`.
Preview differs from Production in two ways: `LLM_MODEL` is set there (the Luna trial), and `GITHUB_TOKEN` is not (it is Sensitive and could not be copied). Preview and Production share one Supabase database and the live Paystack keys.

## 4. Database objects that must exist

| Object | Needed by | State |
|---|---|---|
| `usage_events` | import limits | run (per owner) |
| `portfolio_revisions` | History and undo | run (per owner) |
| `payment_intents` | **the checkout** | run (confirmed present on 2026-10-25 by an anonymous probe that is refused access, as designed) |

Check with: `select to_regclass('public.usage_events'), to_regclass('public.portfolio_revisions'), to_regclass('public.payment_intents');` (each must be non-null).
