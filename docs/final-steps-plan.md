# Final steps plan (Round 1: investigation only)

Written 2026-10-24 against `main` = `dev` = `e0dbcc9`. No code, env var, SQL or deployment was changed to produce this. Evidence is marked **verified** (read in this repo, or run against the live site or vendor docs today), **secondary** (docs or a vendor page read, not exercised) or **unverified** (could not be checked from here).

## Status (updated as phases finish)

| Phase | Status |
|---|---|
| P4 consent and policy | done on dev (a27d825); Meta Pixel removed, GA4 only after consent; waiting for your checks and legal review |
| P2a openai 7 | done locally (not pushed, waiting for your P4-merge confirmation); P2b zod 4 next, with the ops.ts patch-schema fix |
| P5, P6 | after P2 / in parallel |
| P1 | your manual test |
| P3, P7, P8 | waiting (bench key / your "next") |

## Read this first

**Contradictions between your prompt and the code or docs**
1. **P1: the test plan grants Basic only when the payer's e-mail equals `PAYSTACK_TEST_EMAIL`.** (`resolvePlan`, `app/api/paystack-webhook/route.ts`; **verified**.) For any other e-mail the webhook logs "test plan rejected", grants nothing, and returns 200: money taken, nothing applied. The variable exists in Production (its value is Sensitive, so I cannot read it). **Create your test account with exactly that e-mail**, or set the variable to the account's e-mail first.
2. **P1: Production is in live mode.** The Paystack public key in the deployed client bundle starts `pk_live_` (**verified**: fetched the production chunks). The ₦500 test is therefore real money. Whether `PAYSTACK_SECRET_KEY` is also live is **unverified** (Sensitive); a mismatch makes every webhook fail the signature check (400).
3. **P1: the test plan may be recurring.** `CLAUDE.md` says "₦500 monthly" (**secondary**: a doc, not the Paystack dashboard). Refunding does not cancel a Paystack subscription (the code comment at `refund.processed` says so). Cancel the subscription in Paystack after the test or you will be charged again.
4. **P2: your note and my earlier plan said the openai and zod upgrades must be one change. That is no longer true.** `openai@7.43.0` declares `zod: ^3.25 || ^4.0` (**verified**, `npm view`). So openai can go to 7 while zod stays 3.25.76, then zod to 4 as a second commit. Smaller steps, easier to revert.
5. **P2: a real data-loss trap in zod 4** found in our own new code: `lib/portfolio/ops.ts` builds `ProjectInput.partial()` from a schema whose fields use `.default('')`. In zod 4 "`.default()` values apply inside optional fields" (**verified**, zod.dev changelog), so a patch like `{ outcome: 'x' }` would silently reset `problem`, `solution` and `stack` to their defaults. The upgrade must define the patch schema without defaults (the test `update_project` must be extended to prove other fields survive).
6. **P3: `bench/.env.local` does not exist** (**verified**). P3 is blocked on your bench key.
7. **P4: Production already loads the Meta Pixel and GA4.** `NEXT_PUBLIC_META_PIXEL_ID` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` are set in Production (names visible; **verified**) and `components/TrackingScripts.tsx` loads both for every visitor with no consent step. That is the live compliance gap, not a future one.
8. `CLAUDE.md` still describes a VPS, `GPT-4o-mini`, and 2 templates. It is stale in places; the real state is Vercel, 10 templates, `LLM_MODEL`. Not touched here.
9. **`/api/generate` imports `openai` directly** (allowlisted "pending approval"). The openai upgrade touches that file's types, and it is on your "do not touch" list. I need your explicit approval for that, narrow change (see P2).

**Recommended reorder** (reasons below):
`P1 → P4 (consent banner and policy, before any more traffic or marketing) → P2a (openai 7) → P2b (zod 4) → P5 (needs nothing from P2) → P6 in parallel (design-lab only) → P7 → P8`. P3 whenever your key exists, independent of the rest.

---

## P1. Payment verification (Basic, with the ₦500 test plan)

**1. Verdict: GO WITH CHANGES.** The code path is sound (verified below). Three conditions: the e-mail must match `PAYSTACK_TEST_EMAIL`; the Paystack webhook registration must be confirmed by you; you must cancel the subscription and refund afterwards. No code change needed.

**2. Files touched: none.** Path traced (all **verified** in code):
- Checkout: `components/UpgradeModal.tsx`. The test button shows only with `?test=1` (`isTestMode`) and calls `handlePay(TEST_PLAN_CODE, 'basic')` using `NEXT_PUBLIC_PAYSTACK_TEST_PLAN_CODE`.
- Webhook `app/api/paystack-webhook/route.ts`: raw body via `req.text()`, `createHmac('sha512', PAYSTACK_SECRET_KEY)`, `crypto.timingSafeEqual` on equal-length buffers (length checked first), 400 on mismatch. Then `resolvePlan(plan_code, email)`: only the Paystack plan code decides the tier (never the client reference). Test code → `{plan:'basic'}` only for `PAYSTACK_TEST_EMAIL`.
- `findUser`: by `metadata.user_id`, else by e-mail; a payer whose e-mail differs from the account only "grants", never replaces a paid plan.
- `claimPayment`: inserts `payments(ls_order_id UNIQUE, product_tier, amount_cents)` first; duplicate delivery (`23505`) does nothing; failed grant releases the claim so Paystack's retry works.
- `applyEntitlement`: upserts `subscriptions` (plan, status active, `expires_at` = now + 1 year, or Paystack's date for `subscription.create`), then `users.plan` and `users.published_at = now()`.
- Read path: `getUserPlan` (active subscription first, then `users.plan` by name) → `entitlements` → dashboard badge, `/api/update` template checks, public page (`.neq('plan','unpublished')`, so Basic is live at `/slug`, Free is a 404).
- Refund: `refund.processed` marks `payments.refunded_at`, sets subscriptions `expired`, and sets `users.plan='unpublished'` (full refunds only; partial is logged for a human; a still-running bootcamp or invite plan is respected).
- Price check: `PAYSTACK_PRICE_CHECK` is not `enforce` (flags endpoint reports `priceCheckEnforced:false`), so a mismatched amount is logged and still granted. Test plan expected amount: ₦500 = 50,000 kobo.

**3. By hand (you):** create the account with the `PAYSTACK_TEST_EMAIL` address; confirm in the Paystack dashboard (Settings → API Keys & Webhooks) that the live webhook URL is `https://liveportfolio.site/api/paystack-webhook` (**unverified**; the route itself is reachable: `GET` returns 405 and the host is not behind Deployment Protection, **verified**); pay with `?test=1`; run the SQL below; afterwards refund in Paystack and **cancel the subscription**. **Me:** nothing to change; I can watch Vercel logs for `[webhook]` lines if you share timestamps.

**4. Risks:** pk_live/sk_live mismatch (unverified); e-mail mismatch means silent non-grant (verified, see Read first #1); plan may be recurring (secondary); `subscription.create` and `charge.success` both fire, so expect one payment row and an expiry set by whichever is processed first (verified by code, not exercised).

**5. Test plan:** unit and route tests for all of this already exist (`tests/plans.test.ts`, webhook tests; 582 pass). Manual acceptance: the SQL and dashboard checks below on a real payment.

SQL, run by you in the Supabase SQL editor (read-only). Replace the e-mail:
```sql
-- BEFORE paying (expect plan 'unpublished', no subscription, no payment)
select id, email, slug, plan, published_at, plan_expires_at from public.users where email = 'YOU@example.com';
select plan, status, started_at, expires_at from public.subscriptions where user_id = (select id from public.users where email = 'YOU@example.com');
select ls_order_id, product_tier, amount_cents, refunded_at, created_at from public.payments where user_id = (select id from public.users where email = 'YOU@example.com');

-- AFTER paying (expect: users.plan = 'basic', published_at set; one subscriptions row plan 'basic', status 'active', expires_at in the future;
-- one payments row product_tier 'basic', amount_cents 50000, refunded_at null)
-- (re-run the three queries above)

-- AFTER the refund (expect: payments.refunded_at set; subscriptions status 'expired'; users.plan = 'unpublished')
-- (re-run the three queries above)
```
Free vs Basic, what you should see (**verified** from the dashboard code and `lib/plans.ts`): the plan badge reads "Free, unpublished" vs "Basic, published"; the address shows "Reserved for you, not live yet" vs a live link; `liveportfolio.site/<slug>` is a 404 vs the live portfolio; Pro-only items (7 more templates, analytics, QR, weekly score) stay locked on both; editing and the 3 free templates work on both.

**6. Rollback:** refund and cancel in Paystack (the webhook revokes access on a full refund); or manually `update users set plan='unpublished' ...` and mark the subscription expired.
**7. Effort:** 30 to 60 minutes of yours; 0 of mine.
**8. Open questions:** the exact `PAYSTACK_TEST_EMAIL` address (not secret); is the test plan monthly or one-off?

---

## P2. zod 4 and openai upgrade

**1. Verdict: GO WITH CHANGES.** Do it in two commits: **P2a openai 4.104.0 → 7.43.0** (works with zod 3.25.76, which openai 7 still accepts), then **P2b zod 3.25.76 → 4.6.7**.

**2. Files.** zod is imported in 5 files only: `lib/llm/call.ts` (safeParse), `lib/connectors/github.ts` (one schema), `lib/connectors/structure.ts` (CvSchema), `lib/portfolio/ops.ts` (the typed operations), `bench/lib/variants.ts` (bench; has its own `package.json`). openai is imported in `lib/llm/call.ts` and `app/api/generate/route.ts`.
- **openai breaking changes that touch us** (**secondary**, openai-node MIGRATION.md; it is unversioned, so which major introduced which is **unverified**): `beta.chat.completions.parse` moved to `chat.completions.parse` (`lib/llm/call.ts:103`); `zodResponseFormat` throws on purely optional zod fields, so every schema passed to it must use `.optional().nullable()` (CvSchema uses `.nullable()`, OK); Node 22+ required (CI uses 22, **verified**; the Vercel project's Node setting is **unverified**); `httpAgent` removed (we pass only `fetch`, OK); `max_tokens` handling is unchanged by us (`lib/llm/model.ts` already switches to `max_completion_tokens` for GPT-6).
- **zod 4 breaking changes that touch us** (**verified**, zod.dev changelog): `.default()` semantics inside optional fields (**breaks `ops.ts` `update_project` / `update_experience` patches, see Read first #5**); `.strict()` is deprecated but still works (can stay); `z.record(z.string(), z.unknown())` already has two arguments (OK); `.safeParse(...).success/.data` unchanged; `z.infer` unchanged; error shape (`.errors` removed, use `.issues`): we do not read zod errors anywhere except `ops.ts` (`parsed.error.issues[0]`, already `.issues`). Nothing uses `.email()/.url()`, `invalid_type_error`, `errorMap`, `.merge`, `nativeEnum`, `z.function`, `ctx.path`.
- New files: none. Migrations: none.

**3. By hand:** nothing except a go/no-go and the `/api/generate` approval. **Me:** both commits, `npm run verify`, `npm audit --omit=dev`.

**Who else accepts zod 4:** `@ag-ui/core` 1.0.3 accepts `^3.25.18 || ^4.0.0` (**verified**, its package.json); `@ag-ui/client` needs `^3.25.76` (works on both lines is **unverified** beyond that range; we do not plan to install it); `openai@7.43.0` accepts `^3.25 || ^4.0` (**verified**). `json-render` core hard-depends on `zod ^4.3.6` (**verified**), so it is adoptable only after P2b, and I still recommend copying its pattern rather than installing it (experimental parts; version pinning requested by its authors).

**4. Risks:** the `.default` + `.partial` trap (verified, fix known); `zodResponseFormat` with the new openai and a zod 4 schema is a supported combination only per openai's peer range (**secondary**; the live check in step 5 is the proof); Node version on Vercel (unverified); behaviour of `gpt-4o-mini` structured output unchanged by the SDK (secondary).
**5. Test plan:** the existing 582 tests; add: a test that `update_project`/`update_experience` patches leave untouched fields intact (written before the upgrade so it fails first if the trap bites); a schema round-trip for CvSchema through `zodResponseFormat`. Live check on **Preview only**, invented text, app key: structured-output import, `/api/generate`, one error path (bad key or oversize input).
**6. Rollback:** revert the commit; Instant Rollback on Vercel if it ever reached Production.
**7. Effort:** P2a 2 to 4 hours; P2b 3 to 5 hours.
**8. Open questions:** approve the narrow `app/api/generate/route.ts` type fix? Check the Vercel project's Node version is 22 or newer (dashboard → Settings → General), or tell me to set it.

---

## P3. Switch Production to `gpt-6-luna` (`LLM_MODEL`)

**1. Verdict: BLOCKED** on the bench key. `bench/.env.local` is absent (**verified**). Production has no `LLM_MODEL` set (names list; **verified**), so Production runs `gpt-4o-mini`.
**2. Files:** none (the switch is one Vercel env var plus a redeploy). **3. By hand:** create a dedicated low-limit OpenAI project key; put it in `bench/.env.local` (never in chat); later set `LLM_MODEL=gpt-6-luna` in Production and redeploy. **Me:** run `npm run bench:*` (estimate first, about $2 for the dev stage) and report; `bench/README.md` lists the commands.
**4. Risks:** Luna tested on tiny samples only (verified earlier); `gpt-4o-mini-2024-07-18` shuts down 2027-01-14 (secondary, OpenAI notice), so there is time but not forever. **5. Test:** the bench, then Preview with the flag, then Production. **6. Rollback:** remove `LLM_MODEL`, redeploy (Instant Rollback does not restore old env values). **7. Effort:** half a day after the key exists. **8. Open question:** when will the key exist?

---

## P4. Consent banner and privacy policy

**1. Verdict: GO WITH CHANGES; do it early** (see Read first #7). **Everything below about what the law requires is unverified; have a lawyer check the policy and the banner before relying on them.**

**Inventory** (**verified** in code unless noted):

| Request | Where | Personal data it receives | Notes |
|---|---|---|---|
| Google Analytics 4 (`googletagmanager.com/gtag/js`) | every page, all visitors, if `NEXT_PUBLIC_GA_MEASUREMENT_ID` set (it is) | IP address, user agent, page URL and path, referrer, a cookie id | no consent step |
| Meta Pixel (`connect.facebook.net/.../fbevents.js`) and the `<noscript>` image `facebook.com/tr` | every page, if the id is set (it is) | IP, user agent, page URL, cookie ids; the noscript image sends the request even with scripts disabled | no consent step; the noscript tag cannot be gated by JavaScript |
| Paystack `js.paystack.co/v1/inline.js` | when the upgrade modal opens | card and e-mail entry happen in Paystack's frame; we send the e-mail, plan code, our user id in metadata | needed for payment |
| Cloudflare Turnstile `challenges.cloudflare.com` | sign-up and sign-in when a site key is set (flags: off now) | IP, browser signals | off today |
| IPinfo `api.ipinfo.io/lite` | server side, on each portfolio view | the visitor's raw IP (24 h cache; we store only a hashed IP, company and country) | visitor never asked; disclose |
| `api.qrserver.com` | dashboard and preview QR images (Pro feature surfaces) | the portfolio URL, plus the visitor's IP to that host | an external service sees the user's IP |
| Supabase (Auth, DB, Storage) | account, data, images | everything the user enters | processor |
| OpenAI (via `lib/llm`, and `/api/generate`) | import, generate (server side) | import: name, text of the CV with contact details replaced by placeholders (best-effort, pseudonymisation not anonymisation). Generate: bio, project descriptions, name and links as typed; **the e-mail is no longer sent** | disclose; `/api/generate` input is not redacted |
| Fonts | self-hosted (`next/font`, local files) | none | no third-party font request found in the app. The design-lab prototypes are also self-hosted |
| Resend | e-mail sending | recipient address and content | processor |

**What consent is likely needed** (unverified): for visitors in the EU/UK, non-essential cookies and tracking (GA4, Meta Pixel) generally need prior opt-in consent; strictly-necessary storage (auth session, the payment frame, Turnstile) does not. Other regions differ. The honest minimum: load GA4 and the Pixel only after an explicit accept, a "reject" as easy as "accept", a way to change the choice later, and disclosure of IPinfo, QR, Supabase, OpenAI, Resend and Paystack in the policy. `app/privacy/page.tsx` already mentions OpenAI, Meta and cookies but I have not verified that it matches the inventory above.
**2. Files:** new `components/ConsentBanner.tsx` + a small consent store; edit `components/TrackingScripts.tsx` (load only after consent; drop or gate the `<noscript>` pixel); `app/layout.tsx`; `app/privacy/page.tsx`; footer link "Cookie settings". No migrations.
**3. By hand:** the policy text must be approved by you and a lawyer; GA4 and Meta settings (data retention, IP anonymisation) in their dashboards. **Me:** the code and a draft of the policy's data-flow section from the table above.
**4. Risks:** the existing tracking runs today (verified); legal adequacy (unverified). **5. Test:** unit (nothing loads before accept; reject keeps it off; choice persists); real browser with network log at 390 and 1440 (no `googletagmanager`/`facebook` request before consent). **6. Rollback:** revert; setting the two env vars to empty also disables tracking entirely. **7. Effort:** 1 to 1.5 days. **8. Open questions:** keep the Meta Pixel at all? Which regions do you target for the default (EU-style opt-in everywhere is the simplest)?

---

## P5. AG-UI assistant spike (`docs/agent-spike-plan.md`)

**1. Verdict: GO WITH CHANGES.** Foundation is built and tested (`ops.ts`, `commit.ts`, `/api/revisions`); the spike needs two sign-offs and two SQL steps.
**Dependencies (verified from `..\reference\ag-ui`, commit 73b04fd):** `@ag-ui/core` 1.0.3, MIT, peer `zod ^3.25.18 || ^4.0.0`; `@ag-ui/encoder` 1.0.3, MIT, depends on `@ag-ui/core` and `@ag-ui/proto`; `@ag-ui/client` 1.0.3 MIT, needs `rxjs` 7.8.1 and `zod ^3.25.76` (we do not plan to install it). Event types available: `RUN_*`, `TEXT_MESSAGE_*`, `TOOL_CALL_*`, `STATE_SNAPSHOT/DELTA`, `ACTIVITY_*`, `REASONING_*`, `CUSTOM`. Installed-package behaviour is **unverified** until `npm install` is tried.
**2. Files:** new `app/api/assistant/route.ts`, `lib/assistant/{events,tools,run}.ts`, `components/dashboard/AssistantPanel.tsx`; an addition inside `lib/llm` (below); one-line migration `usage_events.kind` check.
**LLM function and the PII boundary:** `lib/llm` today does one structured call. Tool-calling needs a new function in `lib/llm/call.ts` (the only place `openai` may be imported). It changes the boundary in one way: the user's name, bio and projects must reach the model as written for editing to work, so they cannot be pseudonymised; only e-mail, phone and URLs can be (as `redact` does today). Needs your sign-off, recorded in `docs/pii-gateway.md`, plus the privacy-policy line (P4).
**`usage_events` addition:** the existing check is `kind in ('parse_cv','import','score')` (verified in the migration). Add `'assistant'` with a drop-and-recreate of the check constraint inside one transaction (additive in effect, rollback restores the three-value check). You run it.
**3. By hand:** both SQL files (the `usage_events` and `portfolio_revisions` migrations are already run), the new one-line migration, sign-off on the gateway change, the bench key for the tool-calling comparison, the allow-list value (your user id). **4. Risks:** prompt injection through imported text (mitigations designed: data-not-instructions, 4 tools, human Apply, bounded ops; **designed, not yet tested**); model tool-calling quality (unverified until benchmarked); cost. **5. Test:** 20 scripted requests including 5 planted injections, on `gpt-4o-mini` vs `gpt-6-luna` vs one other; route tests for 404 when not Pro or not allow-listed; token reuse and expiry; Apply impossible without confirmation. **6. Rollback:** unset `ASSISTANT_SPIKE`; the route returns 404; revisions let you undo any assistant edit. **7. Effort:** 2 to 3 days with the benchmark. **8. Open questions:** sign off the gateway change and the redaction rule as proposed?

---

## P6. Block catalog and swipe prototype (design-lab)

**1. Verdict: GO. Done as a prototype; waiting for the five-person test** (`C:\Users\Clifford.nwanna\Dev\design-lab\phase2-blocks`, README there). **Catalog coverage for the 10 current templates (verified by reading the templates' sections):** hero, about, projects, experience, skills, credentials (education + certifications), quote, social-links, text, contact: ten blocks, 24 variants, three themes; the Developer "GitHub" section becomes social-links and the Designer "Approach" section is dropped (it is skill categories relabelled). **Mapping so no live page changes:** a portfolio without a layout is `kind: "legacy"` and renders through today's component; the new look is opt-in per user; a nearest-look table exists for the "Try the new look" offer.
**2. Files:** design-lab only, nothing in the repo. **3. By hand:** show it to five people who have not seen the product, on a phone, with their own CV text. **4. Risks:** not tested with real CVs (verified gap); "swiping increases publishing" is an untested hypothesis. **5/6/7/8:** test with people (a day); no rollback needed; open question: real CVs from willing testers?

---

## P7. Port the 3 free templates and the dashboard

**1. Verdict: GO WITH CHANGES, after P6 results and P2.** **Defaults** per your decision: B (Proof) default for portfolios; A and C as swipe options; dashboard uses the onboarding fonts (Bricolage + Hanken), A's layout ideas only.
**2. Files (proposed):** new `components/templates/blocks/*` (the registry), `lib/portfolio/layout.ts` (the layout spec, from the design-lab catalog), new template ids; dashboard `app/dashboard/page.tsx` (large: 2,000+ lines; split the Edit tab out first); additive migration `portfolios.layout jsonb null` with rollback. **3. By hand:** the SQL; choosing the default arrangement per role. **4. Risks:** the dashboard page size makes this the riskiest edit; existing 36 live portfolios must not change (design guarantees it: `layout` null = legacy; a test renders every current template before and after and compares the markup). **5. Test:** golden-markup tests for all 10 legacy templates; Impeccable scan; 360/390/768/1440 overflow check. **6. Rollback:** revert + drop the column (nullable, unused by legacy). **7. Effort:** 1.5 to 2.5 weeks. **8. Open questions:** which three free templates stay free?

---

## P8. After 24 clean hours: e-mail confirmation, Turnstile, social sign-in, Pro for the first 36

**1. Verdict: GO WITH CHANGES.** Order is correct and already documented (`docs/onboarding-plan.md` section 1.7, `docs/social-signin-setup.md`): SMTP, Turnstile, URL config and templates first; test with a plus-addressed mailbox; then **Confirm email ON**; only then providers. The social doc explains why (account linking by e-mail; **secondary**, "verify in current Supabase docs").
**3. By hand (you, in Supabase and provider dashboards):**
- Authentication → **SMTP**: custom SMTP (Resend) with a verified sender domain (SPF, DKIM, DMARC on `liveportfolio.site`); the built-in mailer is rate-limited and for testing.
- **Email templates**: Confirm signup, Reset password, Change email (the plan describes code + link).
- **URL configuration**: Site URL `https://liveportfolio.site`; redirect allow-list `https://liveportfolio.site/**` (and a specific preview pattern only if you test auth on previews).
- **Attack Protection → CAPTCHA**: Cloudflare Turnstile secret in Supabase, site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel (a build-time variable: redeploy without cache).
- **Providers → Email → Confirm email: ON**, then Google, GitHub, LinkedIn (OIDC) in their own consoles; list them in `NEXT_PUBLIC_SOCIAL_PROVIDERS`. Min password length 10, leaked-password protection if your plan has it, anonymous sign-ins off.
**Me:** verify each step with `/api/flags`, run the doc's throwaway-account checklist on the preview, and draft the changes.
**Pro grants for the first 36 (draft only, NOT run).** The existing time-boxed mechanism is `users.plan` + `users.plan_expires_at` (+ `users.bootcamp_code`), downgraded daily by `/api/cron/expire-plans` at 08:00 UTC (**verified**). Whether `bootcamp_code` has a foreign key to `bootcamp_codes` is **unverified** (no schema file defines it), so the marker below goes in a new additive table instead:
```sql
-- 1) ADDITIVE MIGRATION (run once; rollback below). Marker and audit trail for manual grants.
begin;
create table if not exists public.plan_grants (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plan       text not null check (plan in ('basic','pro')),
  reason     text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.plan_grants enable row level security;
revoke all on table public.plan_grants from anon, authenticated;
grant select, insert, delete on table public.plan_grants to service_role;
commit;

-- 2) DRY RUN: who would be granted (paste the 36 e-mails; nothing is changed)
select id, email, plan, plan_expires_at from public.users
 where lower(email) in ('a@example.com' /* , ... 36 e-mails */)
   and plan = 'unpublished';

-- 3) GRANT (only after the dry run looks right; one transaction; skips anyone already paid or granted)
begin;
with target as (
  select id from public.users
   where lower(email) in ('a@example.com' /* , ... */)
     and plan = 'unpublished'
     and not exists (select 1 from public.subscriptions s where s.user_id = users.id and s.status in ('active','cancelled') and s.expires_at > now())
), grant_rows as (
  insert into public.plan_grants (user_id, plan, reason, expires_at)
  select id, 'pro', 'first-36 early users', now() + interval '90 days' from target
  returning user_id, expires_at
)
update public.users u
   set plan = 'pro', plan_expires_at = g.expires_at, published_at = coalesce(u.published_at, now())
  from grant_rows g where u.id = g.user_id;
commit;

-- 4) VERIFY
select u.email, u.plan, u.plan_expires_at, g.reason from public.users u join public.plan_grants g on g.user_id = u.id order by u.email;

-- ROLLBACK for the grant (undoes exactly the grant rows, nothing else)
-- begin;
-- update public.users u set plan = 'unpublished', plan_expires_at = null
--   from public.plan_grants g where g.user_id = u.id and g.reason = 'first-36 early users';
-- delete from public.plan_grants where reason = 'first-36 early users';
-- commit;
```
Note: `published_at` is set so their portfolios go live (Pro includes publishing); remove that line if you want them unpublished until they confirm. The cron expires them after 90 days; change the interval as you wish.
**4. Risks:** Confirm email ON with a broken SMTP locks new sign-ups out (verified in the plan; mitigated by testing with a plus-address first); `NEXT_PUBLIC_*` changes need a redeploy without build cache (verified earlier); the grant SQL's behaviour has not been exercised against your data (unverified). **5. Test:** the throwaway-account checklist in `docs/social-signin-setup.md` section 8 on the preview. **6. Rollback:** Confirm email back OFF; remove providers from `NEXT_PUBLIC_SOCIAL_PROVIDERS` and redeploy; the grant rollback above. **7. Effort:** half a day of yours plus half a day of mine. **8. Open questions:** the 36 e-mails and the grant length (90 days assumed); Pro or Basic?

---

## Summary table

| Phase | Verdict | Blocker or action needed |
|---|---|---|
| P1 Payment test | GO WITH CHANGES | use the `PAYSTACK_TEST_EMAIL` address; confirm webhook registration; cancel the subscription and refund after |
| P2 openai 7, then zod 4 | GO WITH CHANGES | approve the `/api/generate` type fix; check Vercel Node >= 22 |
| P3 Luna in Production | BLOCKED | bench key |
| P4 Consent and policy | DONE on dev (a27d825), awaiting your checks and a lawyer | lawyer review; decide on the Meta Pixel |
| P5 Assistant spike | GO WITH CHANGES | gateway sign-off; `usage_events` kind migration |
| P6 Catalog and swipe | GO (prototype done) | five-person test |
| P7 Port templates and dashboard | GO WITH CHANGES | after P6, P2 |
| P8 Auth hardening, Pro grants | GO WITH CHANGES | your dashboard steps; the 36 e-mails |
