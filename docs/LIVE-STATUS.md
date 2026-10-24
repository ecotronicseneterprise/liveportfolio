# Live status

Built from git and `vercel env ls` (names only; Vercel will not show Sensitive values), not from memory. **Update this file at every merge to `main`.**
Refresh with: `git fetch && git log --oneline --first-parent -5 origin/main && git log --oneline origin/main..origin/dev` and `vercel env ls production --project liveportfolio --scope cliffords-projects-0027534f`, then check `https://liveportfolio.site/api/flags` (its `commit` must equal the merge commit).

Last updated: 2026-10-24. Production serves **`92440f3`** (Merge pull request #4).

## 1. What `main` (Production) contains today: `92440f3`

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

## 2. What `dev` has that `main` does not (`git log origin/main..dev`)

- `27096f5` openai 4.104 to 7.43 (one code line: `chat.completions.parse`).
- `ccc2aed` zod 3.25 to 4.6.7 and the `ops.ts` patch-schema fix. `npm audit --omit=dev`: 0 vulnerabilities.
- `d2e2de2` webhook logs every ignored or rejected event (`[paystack-webhook] ignored ...`). Behaviour unchanged.
- `79b8d92` payment redesign document.
- `430f8aa` the **one-time checkout** (server-owned price, `payment_intents`, verify, return page) first built behind a flag.
- **Next commit (flag removed, this file's commit):** the one-time checkout is the ONLY way to buy a plan (no `CHECKOUT_V2`, no fallback); the `payment_intents` table is required; Terms, pricing, landing and FAQ describe one payment for 12 months, no automatic renewal, 7-day refund guarantee; prices shown in Naira with a labelled dollar estimate; dashboard "Plan and billing" panel (`GET /api/billing`); one support address (`ecotronics.nterprise@gmail.com`, confirm the mailbox exists); `docs/MERGE-CHECKLIST.md`.

**Merging `dev` changes what customers get**: the old card-subscription checkout stops being offered. Its webhook path stays for the one existing Test 500 subscription and any renewals.

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
| `payment_intents` | **the checkout** | **run `supabase/manual/20261026110000_payment_intents.sql` before merging** |

Check with: `select to_regclass('public.usage_events'), to_regclass('public.portfolio_revisions'), to_regclass('public.payment_intents');` (each must be non-null).
