# liveportfolio.site — Claude Code Project Context

## What This Project Is

An AI-powered portfolio platform. People sign up first (account-first flow, `/create/account` to
`/create/generate`), import a CV or GitHub profile or type their details, one LLM call generates the
portfolio copy as structured JSON (default model `gpt-4o-mini`, switchable with `LLM_MODEL`), a private preview
renders in the browser, and a paid plan publishes the portfolio at slug.liveportfolio.site.

**Owner:** Clifford Nwanna / Ecotronics Enterprise  
**Domain:** liveportfolio.site (Namecheap, active until May 2027)  
**Hosting:** Vercel, project `liveportfolio` (team `cliffords-projects-0027534f`). Push to `main` is the production deploy; `dev` builds a preview. Preview and local both use the PRODUCTION Supabase.  
**Local port:** 3101 (never 3000: another app uses it)  
**Stack:** Next.js 15, TypeScript, Supabase (DB, Auth, Storage), OpenAI through `lib/llm`, Paystack, Resend, IPinfo, Vercel  
**Plans:** Free (edit privately, 3 templates), Basic (publish), Pro (all 10 templates, analytics, QR, weekly score). Source of truth: `lib/plans.ts`.  
**Plan docs:** `docs/final-steps-plan.md` (current order of work), `docs/mcp-and-roadmap-plan.md`, `docs/agent-spike-plan.md`, `docs/legal-review.md`.  
**Legacy:** the VPS, Caddy, PM2 and GitHub Actions deploy sections further down are from before the move to Vercel (kept for reference, not verified).

---

## Core Architecture

```
Browser
  ↓
Vercel (edge + serverless Next.js app, middleware.ts)
  ↓
Supabase (DB + Auth + Storage) / OpenAI (only via lib/llm) / Paystack / Resend / IPinfo
```

**Subdomain routing:** middleware.ts reads the Host header on every request.
- `liveportfolio.site` → main app (landing, form, dashboard, API routes)
- `*.liveportfolio.site` → rewrites to `/portfolio/[slug]` → renders user portfolio

**This is the most important architectural fact.** If subdomain routing breaks,
portfolios won't render. Always check middleware.ts first.

---

## Project Structure

```
/
├── middleware.ts                  ← ROUTING BRAIN — do not break this
├── app/
│   ├── page.tsx                   ← Landing page (liveportfolio.site)
│   ├── create/page.tsx            ← 4-step form
│   ├── preview/[portfolioId]/     ← Preview + payment screen
│   ├── portfolio/[slug]/          ← Fallback: liveportfolio.site/portfolio/slug
│   ├── dashboard/page.tsx         ← Post-payment user dashboard
│   └── api/
│       ├── parse-cv/route.ts            ← PDF → structured JSON
│       ├── generate/route.ts            ← THE CORE: form data → AI → portfolio JSON
│       ├── check-slug/route.ts          ← Real-time slug availability
│       ├── paystack-webhook/route.ts    ← Paystack payment confirmation
│       ├── subscribe/route.ts           ← Capture non-paying user email
│       ├── analytics/route.ts           ← Portfolio view counting (batch flush)
│       ├── analytics/event/route.ts     ← Click event tracking
│       ├── analytics/summary/route.ts   ← Dashboard analytics data
│       ├── score/route.ts               ← AI career score (7-day cache)
│       ├── unsubscribe/route.ts         ← One-click unsubscribe
│       ├── cron/drip/route.ts           ← Email drip runner (CRON_SECRET)
│       ├── admin/metrics/route.ts       ← Health check metrics
│       ├── update/route.ts              ← Dashboard edits (no AI)
│       ├── user-plan/route.ts           ← Plan status check
│       ├── delete-account/route.ts      ← Account deletion
│       └── health/route.ts              ← {status: 'ok'}
├── components/
│   └── templates/
│       ├── Minimal.tsx            ← Template 1: editorial minimalism
│       └── Bold.tsx               ← Template 2: dark engineering showcase
├── lib/
│   ├── supabase.ts                ← Client + admin instances
│   ├── prompts.ts                 ← AI system prompt + banned word list
│   ├── ipinfo.ts                  ← IPinfo Lite enrichment (company, country)
│   ├── email-drip.ts              ← All email templates (Flow A, B, C)
│   └── schema.sql                 ← Supabase table definitions
├── scripts/
│   └── health-check.sh            ← Daily VPS health email
└── ecosystem.config.js            ← PM2 config (port 3001, fork mode)
```

---

## Database Schema (Supabase)

### users
| column | type | notes |
|--------|------|-------|
| id | uuid PK | references auth.users |
| email | text unique | login email |
| slug | text unique | → slug.liveportfolio.site |
| plan | text | 'unpublished' \| 'pro' |
| published_at | timestamptz | null until payment |
| custom_domain | text | professional plan only |

### portfolios
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | → users.id cascade delete |
| template | text | one of the 10 ids in lib/plans.ts (3 free, 7 Pro); a Pro id needs the Pro plan |
| content | jsonb | ALL portfolio data — see content shape below |
| health_score | integer | 0–100, recalculated on each update |
| seo_title | text | AI-generated |
| seo_description | text | AI-generated, max 155 chars |
| og_image_url | text | screenshot URL |
| view_count | integer | batch-flushed from memory |

### payments
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| ls_order_id | text unique | Paystack reference (column kept from original) |
| product_tier | text | 'launch' \| 'pro' |
| amount_cents | integer | |

### subscriptions
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| plan | text | 'basic' \| 'pro' |
| status | text | 'active' \| 'cancelled' \| 'expired' |
| started_at | timestamptz | |
| expires_at | timestamptz | used for renewal reminders |

### analytics_events
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| portfolio_id | uuid FK | |
| event_type | text | 'portfolio_view' \| 'click' |
| label | text | click label |
| referrer | text | |
| ip_hash | text | sha256 of IP — never raw IP |
| company | text | from IPinfo Lite (filtered) |
| country | text | from IPinfo Lite (full name) |

### career_scores
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| portfolio_id | uuid FK | |
| score | integer | 0–100 |
| breakdown | jsonb | { presence, projects, experience, skills } |
| summary | text | AI-generated one-liner |
| scored_at | timestamptz | 7-day cache key |

### email_subscribers
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| email | text unique | |
| user_id | uuid nullable FK | |
| subscribed | boolean | false on unsubscribe |
| sequence_step | integer | current drip step |
| sent_flows | jsonb | e.g. `{"a_1": true, "b_7": true}` — deduplication |
| source | text | 'preview_defer' etc |

### portfolios.content JSON shape
```typescript
{
  name: string
  role: string
  headline: string           // AI-generated, max 120 chars
  about: string              // AI-generated, 2 paragraphs
  location: string
  email: string
  github_url?: string
  linkedin_url?: string
  avatar_url?: string
  skills: string[]           // max 15
  skills_narrative: string   // AI-generated one sentence
  skills_grouped: { category: string, items: string[] }[]
  projects: {
    title: string
    problem: string          // AI-generated
    solution: string         // AI-generated
    outcome: string          // AI-generated
    stack: string[]
    url?: string
  }[]
  experience: {
    company: string
    role: string
    period: string
    bullets: string[]
  }[]
}
```

---

## Environment Variables

```bash
NEXT_PUBLIC_ROOT_DOMAIN=liveportfolio.site
NEXT_PUBLIC_APP_URL=https://liveportfolio.site

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=               # safe to expose to client
SUPABASE_SERVICE_ROLE_KEY=                   # SERVER SIDE ONLY — never in client bundle

OPENAI_API_KEY=

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=             # safe to expose to client
PAYSTACK_SECRET_KEY=                         # SERVER SIDE ONLY
NEXT_PUBLIC_USD_TO_NGN_RATE=1400             # update when rate shifts significantly

RESEND_API_KEY=
ADMIN_METRICS_SECRET=                        # protects /api/admin/metrics endpoint
CRON_SECRET=                                 # protects /api/cron/drip endpoint
IPINFO_TOKEN=                                # IPinfo Lite — 50k lookups/month free
```

---

## Critical Rules — Read Before Changing Anything

### 1. One AI call per user, forever
`/api/generate` checks the DB before calling OpenAI. If the user already has a portfolio,
it returns the existing one. **Never remove this check.** It is the economic foundation
of the product — AI cost is front-loaded once, never repeated.

### 2. The middleware must pass Host header through Caddy
Caddy config must have `header_up Host {host}` in the liveportfolio.site block.
Without this line, middleware.ts reads `localhost:3001` for every request and all
subdomains route to the main app instead of the portfolio renderer.

### 3. supabaseAdmin (service role) is server-side only
`lib/supabase.ts` exports two instances:
- `supabase` — anon key, used in client components
- `supabaseAdmin` — service role key, used ONLY in API routes (`/app/api/**`)

Never import supabaseAdmin in any client component or page component.
The service role bypasses Row Level Security — if exposed to the browser, any user
can read all other users' data.

### 4. Portfolio renderer uses supabaseAdmin
`app/portfolio/[slug]/page.tsx` is a public page (no auth). It uses `supabaseAdmin`
to bypass RLS and read any portfolio by slug. This is intentional and correct.

### 4b. New tables: RLS on, grants revoked, in the same migration
New public tables must enable RLS and revoke anon/authenticated grants in the SAME migration. Supabase grants full anon/authenticated privileges on new public tables by default; that default is what let browsers write users/portfolios. Use: alter table x enable row level security; revoke all on table x from anon, authenticated;

### 5. Never call /api/generate for editing
Editing a portfolio (dashboard) calls `/api/update` — a direct JSONB merge in Supabase.
No AI involved. No cost. This is intentional.
If someone asks to "regenerate" a section — that feature does not exist in v1.

### 6. App runs on port 3001
UpJobs.co runs on port 3000 on the same VPS. Never change the port to 3000.
PM2 config: `args: 'start -p 3001'`

### 7. Template quality is non-negotiable
Templates are the product. If they look generic, users won't pay.
Standard: must look indistinguishable from a Framer showcase template in a screenshot.
Test: iPhone SE (375px width) — must look better than 90% of developer portfolios.
Fonts: Minimal uses Playfair Display + DM Sans. Bold uses Space Mono + Sora.
Never use Inter, Arial, or Roboto in templates.

---

## AI Generation — The Master Prompt

**Model:** GPT-4o-mini (NOT GPT-4o — 20x cheaper, equivalent quality for this task)  
**Switching the model:** set `LLM_MODEL` (read by `lib/llm/model.ts`, used by the import gateway and `/api/generate`); unset means `gpt-4o-mini`. `gpt-4o-mini-2024-07-18` shuts down 2027-01-14; the planned replacement is `gpt-6-luna` (GPT-6 models take `max_completion_tokens` and `reasoning_effort`, not `max_tokens`; the helper handles it). The e-mail address is never put in the generation prompt.  
**Response format:** `response_format: { type: 'json_object' }` — enforces valid JSON always  
**Max tokens:** 1,200  
**Temperature:** 0.7

### System prompt (in lib/prompts.ts):
```
You are a professional career copywriter specialising in tech portfolios for 
African and global tech talent. You transform raw professional information into 
polished, recruiter-ready portfolio content.

Write like a sharp recruiter rewrote their profile — competent, calm, specific, 
human. Use concrete specifics and active verbs. Sound like a real person, 
not an AI assistant.

NEVER USE THESE WORDS OR PHRASES:
passionate, results-driven, highly motivated, leveraging, cutting-edge, dynamic, 
innovative, spearheaded, impactful, fast-paced, detail-oriented, proactive, 
team player, self-starter, thought leader, go-getter, synergy, robust, seamless, 
scalable solutions, best-in-class, worked on, assisted with, contributed to.

Return valid JSON only. No preamble, no markdown, no commentary.
```

### Input caps (enforced at API layer, not just frontend):
- bio: 500 chars max
- project descriptions: 200 chars each
- projects: 4 max
- skills: 15 max
- Total estimated input tokens: reject if over 2,500

### Generation SLA:
- Under 5s → full output
- 5–8s → acceptable, step labels maintain perceived momentum
- 8–12s → reduce max_tokens by 30%, shorten outputs
- Over 12s → return fallback JSON with raw user data as placeholder text
- **Never block the user from seeing a preview. Always return something.**

---

## PII & LLM Gateway

Every LLM call goes through `lib/llm` → `callLLM()`. **`openai` (and `api.openai.com`) must never
be imported or called anywhere else.** `npm run check:llm` enforces this (also covered by a vitest
test). Only `app/api/generate/route.ts` is allowlisted, with the comment "pending approval" —
do not add to the allowlist without sign-off.

- `callLLM({ purpose, system, input, schema?, pii: 'redact' | 'block' | 'off', reason?, names? })`
- `redact`: direct contact identifiers (email, phone, URLs/handles, ID numbers near NIN/BVN-style
  context words, Luhn-valid card numbers) and caller-supplied names (exact match) are replaced with
  `[EMAIL_1]`-style placeholders, the model is told to copy them verbatim, and they are restored
  locally in the response. Unknown/mangled placeholders are stripped with a warning.
- Not redacted on purpose: employers, locations, dates, skills — they are the content.
- This is pseudonymisation, **not anonymisation**. Detection is best-effort; never describe the
  output as "anonymous". The rest of the CV text is still sent to OpenAI.
- Engine: `PII_ENGINE=regex` (only engine shipped; Presidio failed the latency gate). If the
  engine fails, `PII_ON_ENGINE_FAILURE=block` (default) returns 503 and sends nothing.
- Never log input, output, tokens or the token map.
- Import path: contact fields in `ImportDraft` come from local detection only, never model output.

Details: `docs/pii-gateway.md`.

## Health Score (client-side, no AI, deterministic)

Calculated in the preview page from `content` JSON:

| Criteria | Points |
|----------|--------|
| avatar_url present | +10 |
| github_url present | +10 |
| linkedin_url present | +10 |
| 3 or more projects | +20 |
| each project.outcome contains a digit | +5 (max 15) |
| about word count > 100 | +10 |
| skills.length >= 5 | +10 |
| experience.length > 0 | +15 |
| **Total possible** | **100** |

Show as progress bar. Show checklist of MISSING items only.
Each missing item is a link to the relevant form field.
Persist to `portfolios.health_score` on save and update.

---

## Payment Flow

Payment processor: **Paystack**, LIVE mode only (there is no test mode in Production or on Preview; both use the live keys). Details and the design:
`docs/payment-redesign.md`. Webhook: `/api/paystack-webhook`. Plans and prices: `lib/plans.ts` (display) and `lib/billing/prices.ts` (what is charged, in kobo).

### One checkout, no flag

There is ONE way to buy a plan: the server-created one-time checkout below. There is no rollout flag and no fallback to the old plan-code popup (the old card-subscription flow never completed a live payment and was removed). If `/api/checkout` or Paystack initialize fails, the modal shows a message with the support address. The webhook still recognises the three plan codes (`PAYSTACK_BASIC_PLAN_CODE`, `PAYSTACK_PRO_PLAN_CODE`, `PAYSTACK_TEST_PLAN_CODE`) so the one existing Test 500 subscription and any renewals keep working; no client code uses a plan code.

Rule: a flag is justified only for an unfinished feature or a kill switch. Settings such as `LLM_MODEL`, `GITHUB_TOKEN` and the Paystack keys are configuration, not flags.
`docs/LIVE-STATUS.md` lists what is live and every Production env var name by class (update it at every merge); `docs/MERGE-CHECKLIST.md` is the pre-merge list.

### The new one-time checkout (`lib/billing/*`)
1. `POST /api/checkout { tier }`: authenticated; the browser sends ONLY the tier. The server picks the price and currency, generates the reference (`lpi_...`), writes a row in `payment_intents` (migration `supabase/manual/20261026110000_payment_intents.sql`, run by hand; **required**, without it checkout answers 503), and calls Paystack initialize with **no plan and no channels** (so every channel enabled on the account is offered). 10 checkouts per user per hour. Basic is refused while a Pro plan is running. The owner-only `test` tier (₦500) is refused unless the account e-mail equals `PAYSTACK_TEST_EMAIL`.
2. The person pays on Paystack, which redirects to `/checkout/return`.
3. **Two independent paths grant, through the same idempotent function `grantIntent` (`lib/billing/grant.ts`):**
   - the webhook's `charge.success` branch trusts only references found in `payment_intents`, and checks status, amount, currency and that the payer is the intent's user;
   - `POST /api/checkout/verify` (called by the return page) asks Paystack `GET /transaction/verify/:reference` and checks `data.status`, amount, currency and reference.
   `claimPayment` (unique `payments.ls_order_id`) is the lock, so webhook and return page together grant once.
4. A grant writes the payment row, a `subscriptions` row ending 12 months out (stacked on any remaining time), and `users.plan` and `published_at`. It does **not** set `users.plan_expires_at`: refunds must be able to revoke, and the subscription row is the source of truth for paid plans. The end date is decided once and stored on the intent (`granted_expires_at`), so a retry cannot add a second year.
5. There is no auto-renewal. At the end the nightly job (`/api/cron/expire-plans`) expires the subscription after 3 days of grace and unpublishes. **Renewal reminders for one-time plans are NOT built yet** (design in `docs/payment-redesign.md` 2.6); the existing 30-day reminder e-mail still says "renews automatically", which is false for one-time payments, so build 2.6 before the first one-time plan nears its end.
6. Refunds (any flow): `refund.processed` marks `payments.refunded_at`, ends the subscription and sets `users.plan = 'unpublished'` (full refunds only; partial ones are logged for a human). Refunds are issued by hand in Paystack. A 7-day refund guarantee is promised on the site and in `app/terms/page.tsx`.

### Webhook rules (both checkouts)
- Verify the HMAC-SHA512 signature over the RAW body (constant-time compare) before anything else.
- Return 200 for anything deliberately ignored; 500 only for database failures (Paystack then retries).
- **Every ignored or rejected event writes one warn line** (`[paystack-webhook] ignored event=... reason=...`): event type, reference, reason, amount, currency, whether a plan code was present; never the e-mail, card data or signature. A `charge.success` with no plan code on the ORIGINAL path is still ignored (reason `no_plan_code`): that is the gap the one-time checkout removes.
- Never put secrets or personal data in logs. `PAYSTACK_PRICE_CHECK=enforce` makes an amount mismatch on the plan-code path reject instead of only log.

### Testing payments
Everything in Production is live money (Paystack has no test mode here; Preview shares the live keys). Local tests stub Paystack (`tests/billing-checkout.test.ts`); the live flow can only be proven with a real payment, so after any merge that touches billing run the checklist in `docs/MERGE-CHECKLIST.md`: the ₦500 owner test (`/dashboard?test=1`, account = `PAYSTACK_TEST_EMAIL`), then a real ₦15,000 Basic payment, then refund both in Paystack. Refunds are issued by hand in Paystack and reverse the plan automatically (full refunds only).
- The dashboard has a "Plan and billing" panel (`GET /api/billing`): plan, end date, last five payments, the 7-day refund line and the support address (`SUPPORT_EMAIL` in `lib/brand.ts`; confirm the mailbox exists).
- Prices are shown in Naira everywhere; outside Nigeria a dollar figure is only a labelled estimate (`components/PriceTag.tsx`). All customer-facing billing wording lives in `lib/billing/copy.ts` and `app/terms/page.tsx`; keep them in step. Do not promise reminder e-mails until part 2.6 of `docs/payment-redesign.md` ships.
- Manual grant for a bank-transfer payer: dry run, grant and rollback SQL in `docs/payment-redesign.md` 2.7, with a reference like `manual-YYYYMMDD-<initials>`. Never reuse a Paystack reference (especially an abandoned one).

## Rate Limits

| Endpoint | Limit | Method |
|----------|-------|--------|
| /api/generate | 1 per user account (lifetime) | DB check |
| /api/generate | 5 per IP per day | in-memory Map |
| /api/parse-cv | 3 per IP per hour | in-memory Map |
| /api/check-slug | 10 per IP per minute | in-memory Map |
| /api/analytics | 1 per IP+slug per hour | in-memory Set |

---

## Analytics Pipeline

Portfolio views are tracked in `analytics_events` (event_type = `portfolio_view`).
Click events are tracked in `analytics_events` (event_type = `click`).

**IPinfo enrichment** (`lib/ipinfo.ts`):
- Called fire-and-forget from `app/portfolio/[slug]/page.tsx` on every view
- Uses IPinfo Lite API: `https://api.ipinfo.io/lite/${ip}?token=`
- Fields: `as_name` → filtered company name, `country` → full country name
- 24-hour cache: if ip_hash seen in last 24h, reuses company/country from DB
- Private/loopback IPs skipped. Timeout: 2 seconds. Never blocks page render.
- `filterCompany()` removes noise: ISPs, mobile carriers (MTN, Airtel, Glo), hosting providers, universities

**Dashboard analytics** (`/api/analytics/summary`):
- Views-by-day bar chart (Mon–Sun, last 30 days, portfolio_view only)
- Top referrer sources (LinkedIn, WhatsApp, Twitter/X, GitHub, Google, Direct, Other)
- Unique visitors: distinct ip_hash count
- Recent activity: deduplicated by ip_hash, max 5 most recent unique visitors

---

## Career Score

`/api/score` calls GPT-4o-mini to score the portfolio 0–100 across 4 dimensions:
- `presence` — avatar, contact links, location
- `projects` — number, outcome metrics, stack depth
- `experience` — roles, periods, bullet quality
- `skills` — count, grouping, narrative

Result cached in `career_scores` table for 7 days. Ownership-checked.
Pro users see real score. Basic users see blurred placeholder (72/100).

---

## Email Drip System

Cron endpoint: `GET /api/cron/drip` — protected by `x-cron-secret` header.
Run daily at 07:00 UTC via VPS crontab.

**Flow A** (free users, days 1/3/6/12): nudge to publish  
**Flow B** (Basic subscribers, days 7/21/45): nudge to upgrade to Pro  
**Flow C weekly** (Pro, Mondays): career score email  
**Flow C monthly** (Basic+Pro, 1st of month): views summary + top source  
**Renewal** (Basic+Pro, 30 days before expires_at): renewal reminder  

Deduplication: `sent_flows` JSONB column in `email_subscribers`.
Each key (e.g. `a_1`, `b_7`, `c_score_2026_w2_5`) is set `true` after send.
Email sent exactly once per user per step, forever.

Unsubscribe: `GET /api/unsubscribe?token=<base64url(email)>` sets `subscribed=false`.

---

## Banned Slugs

These slugs must be blocked in `/api/check-slug`:
`api, www, app, admin, blog, help, dashboard, status, support, login, signup,
register, pricing, about, contact, terms, privacy, docs, faq, team, careers,
demo, test, null, undefined, liveportfolio`

---

## Deployment

> **Current state (confirmed by the owner, 2026-10-24): production deploys on Vercel.** A push to `main` is the deploy; rollback = Vercel Instant Rollback (code) plus the rollback SQL (database). There is no staging project and preview deployments use the production Supabase. The VPS / Caddy / PM2 / GitHub Actions material below predates the June 2026 migration to Vercel and is kept for reference only; it has not been re-verified. Env vars (including secrets) live in the Vercel project settings.

### How deploys work (fully automated)
Push to `main` → GitHub Actions does everything:
1. Builds the app on GitHub's servers (x86_64)
2. Rsyncs `.next`, `public`, `scripts`, `package.json`, `ecosystem.config.js` to VPS
3. Copies `.env.local` from old release to new (preserves secrets across deploys)
4. Runs `npm install --omit=dev` on VPS (ARM64-native binaries — must run on VPS, not CI)
5. Reloads PM2 with `ecosystem.config.js --env production --update-env`
6. Reinstalls the daily health-check cron

**You never need to SSH into the VPS for a normal deploy.**

### VPS Details
- IP: 89.167.93.25
- User: deploy
- SSH: `ssh deploy@89.167.93.25`
- App directory: `/home/deploy/apps/liveportfolio`
- App port: 3001 (UpJobs runs on 3000 — never use 3000)
- PM2 process name: `liveportfolio`
- Architecture: ARM64 (Hetzner) — node_modules must be installed on VPS, never rsynced from CI

### .env.local on VPS
Lives at `/home/deploy/apps/liveportfolio/.env.local`.
**Never committed to git.** Preserved automatically across deploys by the workflow.
If it ever gets lost (e.g. first deploy to a fresh VPS), recreate it manually then run:
```bash
pm2 startOrReload /home/deploy/apps/liveportfolio/ecosystem.config.js --env production --update-env
```

Required variables:
```
NEXT_PUBLIC_ROOT_DOMAIN=liveportfolio.site
NEXT_PUBLIC_APP_URL=https://liveportfolio.site
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_USD_TO_NGN_RATE=1400
RESEND_API_KEY=
ADMIN_METRICS_SECRET=
CRON_SECRET=
IPINFO_TOKEN=
```

### ecosystem.config.js
Reads `.env.local` automatically via `loadEnv()` and passes all vars into PM2's env.
This means PM2 never needs manual env injection — just reload after `.env.local` changes.

### Swap file
The VPS has a 2GB swap file at `/swapfile` to prevent OOM during `npm install`.
It is made permanent via `/etc/fstab`. Never delete it.

### If a deploy fails and rolls back
The workflow automatically reverts to `liveportfolio__previous`.
To debug: `pm2 logs liveportfolio --lines 50 --nostream`

### VPS health and security checks — run these every time you SSH in

**Full security scan (miner detection, authorized_keys, SSH logins, /tmp processes):**
```bash
bash /home/deploy/apps/liveportfolio/scripts/check-security.sh
```

**Quick site health check:**
```bash
pm2 list && curl -I http://localhost:3001
```

**Trigger health email manually:**
```bash
bash /home/deploy/apps/liveportfolio/scripts/health-check.sh
```

**Check for active miner in one line:**
```bash
ps aux | grep -E 'bash [A-Za-z0-9]{6}' | grep -v grep; ls -la /tmp/ /var/tmp/; cat /home/deploy/.ssh/authorized_keys
```

**Verify authorized_keys fingerprints (should show exactly 2 known keys):**
```bash
ssh-keygen -lf /home/deploy/.ssh/authorized_keys
# Expected:
# SHA256:0tBBdl72QwEJ60a1Kyd+ZZ2T3Zgww7qNzaOfpZ4avxQ  clifford@hetzner
# SHA256:CPR8Hb/4RRDKZ7AhSIrDkoOJptKnuGeRE+54ckf9w6I  github-actions-liveportfolio-4
```

**Check recent SSH logins (flag anything not from 197.210/197.211/102.91/20.x/64.236):**
```bash
sudo grep "Accepted publickey" /var/log/auth.log | tail -20
```

**Kill miner and clean artifacts (emergency):**
```bash
kill -9 $(ps aux | grep -E 'bash [A-Za-z0-9]{6}' | grep -v grep | awk '{print $2}') 2>/dev/null
rm -rf /tmp/.XIN-unix /var/tmp/.bin /var/tmp/.unix /dev/shm/.cm-loader.lock
pm2 restart liveportfolio && sleep 5 && curl -I http://localhost:3001
pm2 save
```

**Miner watchdog pattern (for recognition):**
- Binary: `javae` — stores itself in `/tmp/.XIN-unix/`, `/var/tmp/.unix/`, `/dev/shm/`
- Spawns children named `bash XXXXXX` (random 6-char suffix) every few hours
- Tries `crontab LIST` then `crontab DELETE` every ~30 min in rapid bursts of 3
- Lock file: `/dev/shm/.cm-loader.lock` — created by the loader on each re-download
- `chattr +i` on crontab blocks all persistence attempts
- All three execution dirs now have `noexec` — binary cannot run even if downloaded

**Verify noexec mounts are active (check after every reboot):**
```bash
sudo mount | grep -E '/tmp|/var/tmp|/dev/shm'
# All three should show: noexec
```

### Reading the PM2 restart counter

`pm2 list` shows a `↺` (restart) count. Here's how to interpret it:

| Restarts | Status | Meaning |
|----------|--------|---------|
| +1 after a deploy | online | Normal — `pm2 reload` in vps-deploy.sh increments the counter |
| 0 for a long time | online | Healthy baseline |
| Jumping rapidly | online or errored | Crash-loop — investigate logs |
| Any number | errored | App is crashing — run `pm2 logs liveportfolio --lines 50 --nostream` |

**The restart counter alone is not an attack signal.** The real attack signals are:
- App status = `errored` with no deploy happening
- Counter jumps 5+ times in minutes with high CPU
- `/tmp` processes or miner artifacts (caught by check-security.sh)

Reset the baseline after any incident or deploy session: `pm2 reset liveportfolio`

### PM2 commands
```bash
pm2 list                                    # see all running processes
pm2 logs liveportfolio --lines 50 --nostream # read app logs
pm2 startOrReload ecosystem.config.js --env production --update-env  # reload with env
pm2 restart liveportfolio                   # hard restart (brief downtime)
pm2 stop liveportfolio                      # stop
pm2 save                                    # persist process list across reboots
pm2 reset liveportfolio                     # reset restart counter
```

### Caddy config location
`/etc/caddy/Caddyfile`

### Key Caddy line (never delete from the liveportfolio.site block)
`header_up Host {host}`

### GitHub Actions secrets required
```
VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_SSH_PORT
OPENAI_API_KEY, RESEND_API_KEY, PAYSTACK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ROOT_DOMAIN
ADMIN_METRICS_SECRET, CRON_SECRET, IPINFO_TOKEN
```

### Daily health check email
- Script: `scripts/health-check.sh`
- Cron: daily at 6:00 AM UTC (7:00 AM Lagos time)
- Sends to: nwannachumaclifford@gmail.com via Resend
- Shows: app status, response time, SSL days, revenue, signups, published users,
  email list, portfolio views, top portfolios, recent signups, recent payments
- Metrics endpoint: `GET /api/admin/metrics` (requires `x-metrics-secret` header)
- To trigger manually:
```bash
RESEND_API_KEY=... ADMIN_METRICS_SECRET=... bash /home/deploy/apps/liveportfolio/scripts/health-check.sh
```

### VPS incident playbook (2026-06-20 — XMRig crypto miner / SSH key compromise)

**Full incident log:** `INCIDENT-2026-06-20.md` in the repo root.

**What happened:** Old VPS (`46.225.186.103`) was compromised with XMRig miner since Jun 12.
New VPS (`89.167.93.25`) was provisioned but attacker re-entered within 2 hours using the
GitHub Actions SSH private key stolen from the old server. Attacker planted miner at
`/tmp/.XIN-unix/`, `/tmp/rJEM54` (script, self-deleted), `/var/tmp/.bin`, and added rogue
SSH keys to both `deploy` and `root` authorized_keys.

**Entry vector:** `40.76.238.186` (Azure relay), fingerprint `SHA256:VHVDYAFOI1YzNd9SOChkAkzdIZmAzJJH7OajnqJ+uAQ`

**Fix applied:**
- Killed miner processes, deleted all miner files
- Removed attacker's `beaj` RSA key and two unknown ED25519 keys from authorized_keys
- Generated new GitHub Actions SSH key — old one was compromised
- Set `PermitRootLogin no` in sshd_config
- Locked both authorized_keys files with `chattr +i`

**Lesson: Never reuse SSH keys from a compromised server. Generate new keys first.**

---

### How to detect an active attack — run these immediately if suspicious

```bash
# 1. One-liner: catches random-named processes (miner signature) + recent SSH logins
ps aux | grep -E '[a-zA-Z0-9]{6}\s*$' | grep -v "grep\|pts/\|sshd\|systemd\|kworker\|caddy\|next-server\|unattended" ; echo "---LOGINS---" ; sudo grep "Accepted publickey" /var/log/auth.log | tail -10

# 2. Check /tmp and /var/tmp for new files (miners always land here)
ls -la /tmp/ /var/tmp/ /dev/shm 2>/dev/null

# 3. Check authorized_keys for extra keys (should be exactly 2 lines)
cat /home/deploy/.ssh/authorized_keys
sudo cat /root/.ssh/authorized_keys

# 4. CPU top — miner will sit at high CPU with a random name
ps aux --sort=-%cpu | head -10

# 5. Check for processes running from /tmp (never normal)
ls /proc/*/cwd 2>/dev/null | xargs -I{} sh -c 'target=$(readlink {} 2>/dev/null); echo "$target {} "; ' 2>/dev/null | grep "/tmp\|/var/tmp\|/dev/shm"
```

**Clean state looks like:**
- `deploy` authorized_keys: exactly 2 lines — verify with `ssh-keygen -lf /home/deploy/.ssh/authorized_keys`
  - `SHA256:0tBBdl72QwEJ60a1Kyd+ZZ2T3Zgww7qNzaOfpZ4avxQ` — clifford@hetzner (your personal key)
  - `SHA256:CPR8Hb/4RRDKZ7AhSIrDkoOJptKnuGeRE+54ckf9w6I` — github-actions-liveportfolio-4 (forced command, restricted)
- `root` authorized_keys: exactly 1 line (`clifford@hetzner`)
- No processes with working dir `/tmp` or `/var/tmp`
- No random 6-char process names at top of CPU
- SSH logins only from: `197.210.x.x` / `197.211.x.x` / `102.91.x.x` (MTN Nigeria), `64.236.x.x` / `20.x.x.x` / `172.x.x.x` / `48.217.x.x` (GitHub Actions — full 172.x range, Azure-hosted runners rotate IPs freely)

**GitHub Actions key is now restricted** — forced command `/home/deploy/deploy-entrypoint.sh` means stolen key = dead end, no shell access possible.

**Known attacker IPs to watch for:** `40.76.238.186` (Azure), `130.131.55.243` (attacker June 21), `46.225.186.103` (old compromised VPS)

---

### Immutable file inventory (chattr +i locked)

These files are intentionally immutable — never try to edit them without unlocking first:
```bash
sudo lsattr /home/deploy/.ssh/authorized_keys    # deploy SSH keys
sudo lsattr /root/.ssh/authorized_keys           # root SSH keys
sudo lsattr /var/spool/cron/crontabs/deploy      # crontab
sudo lsattr /etc/caddy/Caddyfile                 # Caddy config
```

To unlock any of them: `sudo chattr -i <file>` → edit → `sudo chattr +i <file>`

---

### SSH key inventory (authorized_keys)

Three keys are authorised. Expected fingerprints:
```
SHA256:0tBBdl72QwEJ60a1Kyd+ZZ2T3Zgww7qNzaOfpZ4avxQ  clifford@hetzner          (your personal key — unrestricted)
SHA256:CPR8Hb/4RRDKZ7AhSIrDkoOJptKnuGeRE+54ckf9w6I  github-actions-liveportfolio-4  (forced command only)
SHA256:aGN60hpBFhvBKnUpHFI7258BWbRdH1P9bampL25i+Xc  github-actions-cv360       (forced command only)
```

Both GitHub Actions keys are restricted with:
```
command="/home/deploy/deploy-entrypoint.sh",no-agent-forwarding,no-X11-forwarding,no-pty
```
The `deploy-entrypoint.sh` (root-owned at `/home/deploy/deploy-entrypoint.sh`) whitelists
exactly: rsync, mkdir for incoming dirs, and vps-deploy.sh for each app. Stolen key = dead end.

---

### How to rotate a GitHub Actions SSH key

Use this procedure any time a key may be compromised or you want to cycle keys.

**Step 1 — Generate new keypair on VPS:**
```bash
# For liveportfolio:
ssh-keygen -t ed25519 -C "github-actions-liveportfolio-5" -f /tmp/lp_key -N ""
# For cv360:
ssh-keygen -t ed25519 -C "github-actions-cv360-2" -f /tmp/cv360_key -N ""
```

**Step 2 — Add new key to authorized_keys (unlock → append → lock):**
```bash
sudo chattr -i /home/deploy/.ssh/authorized_keys
echo 'command="/home/deploy/deploy-entrypoint.sh",no-agent-forwarding,no-X11-forwarding,no-pty '$(cat /tmp/lp_key.pub) | sudo tee -a /home/deploy/.ssh/authorized_keys
sudo chattr +i /home/deploy/.ssh/authorized_keys
```

**Step 3 — Copy private key to GitHub Actions secret:**
```bash
cat /tmp/lp_key   # copy everything including BEGIN/END lines
```
Go to: GitHub repo → Settings → Secrets and variables → Actions → update `VPS_SSH_KEY`

**Step 4 — Remove the old key from authorized_keys:**
```bash
sudo chattr -i /home/deploy/.ssh/authorized_keys
# Edit the file and delete the old key line
sudo nano /home/deploy/.ssh/authorized_keys
sudo chattr +i /home/deploy/.ssh/authorized_keys
# Verify
ssh-keygen -lf /home/deploy/.ssh/authorized_keys
```

**Step 5 — Clean up:**
```bash
rm -f /tmp/lp_key /tmp/lp_key.pub /tmp/cv360_key /tmp/cv360_key.pub
```

**Step 6 — Verify deploy still works:**
Push a trivial commit to the repo and confirm GitHub Actions succeeds.

**Rules:**
- Never reuse a key from a compromised server — generate fresh
- Never leave private key files in /tmp longer than needed — delete immediately after copying
- After any rotation, update the fingerprint table above with the new hash
- `authorized_keys` is `chattr +i` — nobody (not even root) can modify it without the explicit unlock step

---

### VPS incident playbook (2026-06-12 — kernel/network SIGKILL)

**What happened:** A transient kernel/network issue made specific IP ranges (Cloudflare
1.0.0.1/104.18.x.x, Google 142.251.x.x) unreachable. Any process making outbound HTTPS
to those ranges was SIGKILLed — this hit curl, Node.js, and Next.js itself (which needs
Supabase on startup). Separately, a debugging session had run `pm2 delete liveportfolio`,
removing the app from PM2's process list entirely. A reboot fixed the network issue
(likely cleared corrupted kernel conntrack state, possibly triggered by heavy port-scan
traffic or an upstream Hetzner network blip).

**Fix:** `sudo reboot`, wait 60s, then if the app isn't in PM2's list:
```bash
pm2 start /home/deploy/apps/liveportfolio/ecosystem.config.js --env production
pm2 save
curl -I https://liveportfolio.site   # confirm live
```

**PM2 rule — never delete, only stop:**
- `pm2 stop liveportfolio` — keeps it in the saved process list ✓
- `pm2 delete liveportfolio` — removes it entirely, survives reboots as gone ✗

**Mandatory last step after any VPS debugging session involving process restarts:**
Always run `pm2 save` and `curl -I https://liveportfolio.site` to confirm the site
is live before ending the session. This applies to any AI tool or human operator.

---

### VPS crontab playbook — immutable file hardening

The deploy crontab file is intentionally locked with `chattr +i` as a security measure.
This means `crontab -e` (even with `sudo`) will always fail with "rename: Operation not permitted".

**Never try to fix the rename error by changing directory permissions** — the lock is intentional.

**To add or edit a cron line:**
```bash
# 1. Check the lock is there
sudo lsattr /var/spool/cron/crontabs/

# 2. Remove the immutable flag
sudo chattr -i /var/spool/cron/crontabs/deploy

# 3. Append the new line directly (bypass crontab's rename dance)
echo '...' | sudo tee -a /var/spool/cron/crontabs/deploy

# 4. Verify
sudo cat /var/spool/cron/crontabs/deploy

# 5. Re-lock immediately
sudo chattr +i /var/spool/cron/crontabs/deploy

# 6. Confirm lock is back
sudo lsattr /var/spool/cron/crontabs/
```

**Critical: cron does NOT read .env.local — never use $CRON_SECRET in cron lines.**
Always hardcode the literal secret value in single quotes, same pattern as the drip cron:
```
0 7 * * * curl -s -H 'x-cron-secret: '"YOUR_LITERAL_SECRET"'' http://localhost:3001/api/cron/drip
```

**Current cron lines (as of 2026-06-17):**
```
0 7 * * *   curl drip → localhost:3001/api/cron/drip (literal secret, daily 07:00 UTC)
0 6 * * *   health-check.sh (daily 06:00 UTC)
30 7 * * 1  curl affiliate → liveportfolio.site/api/cron/affiliate (Mondays 07:30 UTC)
```

⚠️ The affiliate cron line currently uses `$CRON_SECRET` which will NOT expand in cron.
Fix it by replacing `$CRON_SECRET` with the literal secret value (same as the drip line).

---

### Affiliate invite link system

Invite links give affiliates a one-time URL that lands the recipient at `/create` pre-loaded
with free Pro on signup. Each token is single-use, expires in 7 days, and is stored in
`invite_tokens` (Supabase).

**Generate an invite link — run on VPS:**
```bash
curl -s -X POST \
  -H 'x-cron-secret: '"YOUR_LITERAL_SECRET"'' \
  -H "Content-Type: application/json" \
  -d '{
    "partner_key": "esther",
    "recipient_email": "anaguesther2@gmail.com",
    "recipient_name": "Esther Anagu",
    "free_pro": true,
    "expires_days": 7
  }' \
  http://localhost:3001/api/admin/invite
```

Use `localhost:3001` not the public domain — avoids the curl-gets-killed issue on the VPS.

Response:
```json
{
  "url": "https://liveportfolio.site/invite/<token>",
  "token": "<64-char hex>",
  "expires_at": "..."
}
```

**To onboard a different affiliate**, change `partner_key`, `recipient_email`, `recipient_name`.
The `partner_key` must exist in the `PARTNERS` map in `app/api/cron/affiliate/route.ts` —
add the new partner there first, then redeploy, then generate the link.

**When to build an admin UI:**
Come back to this when you have 5+ active affiliates, or are generating links more than
twice a week. At that point, build a simple `/admin` page (password protected) with a form.
For now, the VPS curl command is the right tool.

**How the invite flow works end-to-end:**
1. You run the curl command → get a URL like `liveportfolio.site/invite/<token>`
2. Send that URL to the affiliate's referral (or let the affiliate share it)
3. Recipient visits the link → server validates token → redirects to `/create?ref=esther&invite=<token>&free=true`
4. Recipient sees "🎁 You've been invited — your Pro account is free" banner
5. They complete the form and sign up → `invite_tokens` is marked used → `users.plan` set to `pro`
6. Token cannot be reused — `WHERE used = false` in the UPDATE prevents race conditions

---

## Templates

There are **10 templates** (ids and plan gating in `lib/plans.ts`): 3 free and 7 Pro. Only Minimal and Bold are described below; the rest are in `components/templates/*.tsx`. A redesign (new template ids behind per-user opt-in, so no live page changes) is planned in `docs/final-steps-plan.md` (P6, P7).

### Minimal.tsx
- Aesthetic: editorial/magazine minimalism
- Font: Playfair Display (headings) + DM Sans (body) via next/font
- Colors: white background, #0A0A0A text, #1D9E75 teal accent
- Max-width: 680px centered

### Bold.tsx
- Aesthetic: dark-mode engineering showcase
- Font: Space Mono (headings) + Sora (body) via next/font
- Colors: #0D1117 bg, #F0F6FF text, #58A6FF blue accent
- Layout: fixed left sidebar (desktop), collapsible (mobile)

### Template quality bar
Every template must pass: screenshot looks like Framer showcase, iPhone SE
(375px) looks good, Lighthouse performance 90+, no horizontal scroll.

---

## What Does NOT Exist in v1 (do not build)

- Drag-and-drop editor
- Resume PDF generation
- AI regeneration after initial generation
- Subscription pricing
- LinkedIn OAuth import
- Video sections
- Mobile app
- Multi-language support
- Social/community features
- Custom backend logic per user

---

## Pricing

| Plan | Price | Key features |
|------|-------|-------------|
| Launch | $9 one-time | Permanent hosting, both templates, watermark removed |
| Professional | $19 one-time | Everything + custom domain support |

$300/month target = 16 Professional sales/month.

---

## Business Context

This is a solo product by Clifford Nwanna (Ecotronics Enterprise, Lagos Nigeria).
Target market: African tech professionals and career switchers who need a professional
portfolio to get hired for remote jobs.

**The product sells confidence and identity transformation, not a website.**
The preview screen is the sales page. The emotional moment is when the user sees
their name and projects transformed professionally.

Positioning: "The fastest way to look hireable online."
Never say: "AI portfolio builder", "website builder", "portfolio generator".

The email list of non-paying users is a long-term business asset.
Target: 10,000 subscribers within 18 months.
Every subscriber is a high-intent African tech professional.
