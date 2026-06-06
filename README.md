# LivePortfolio

AI-powered portfolio builder that publishes instantly at `slug.liveportfolio.site`

Turn your CV or raw experience into a live, professional portfolio in 5 minutes.

---

## What it does

1. Fill a 4-step guided form (or upload your CV to auto-fill)
2. One AI call rewrites everything into polished, recruiter-ready copy
3. Preview your full portfolio in-browser before paying
4. Pay once — portfolio goes live permanently at `slug.liveportfolio.site`

---

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (Postgres, Auth, Storage, Realtime)
- **OpenAI GPT-4o-mini** (one call per user, result stored permanently)
- **Paystack** (one-time payment, webhook-confirmed)
- **Resend** (transactional email + automated drip sequences)
- **Caddy** (reverse proxy, auto-SSL, wildcard subdomains)
- **PM2** (process management, port 3001)
- **TailwindCSS**

---

## Features

### Core
- Multi-tenant subdomain architecture (`slug.liveportfolio.site`)
- AI-generated portfolio copy — no buzzwords, sounds human
- 2 professional templates: **Minimal** (Playfair Display + DM Sans) and **Bold** (Space Mono + Sora)
- One-time payment — no subscriptions, no monthly fees
- CV PDF auto-parsing to pre-fill the form
- Real-time slug availability check

### Analytics
- Portfolio view tracking (IP-hashed, deduplicated)
- Views-by-day bar chart (last 30 days)
- Top traffic sources (LinkedIn, WhatsApp, GitHub, Google, Direct)
- Unique visitor count
- Recent visitor feed with company and country enrichment (via IPinfo Lite)
- Click event tracking

### Career Score
- AI-powered career score (GPT-4o-mini, 7-day cache)
- Breakdown across presence, projects, experience, skills
- Blurred for Basic plan (upgrade prompt)

### Portfolio Health Score
- Deterministic 0–100 score calculated from content completeness
- Checklist of missing items with links to fix them
- Updates in real-time as user edits

### Email Drip System
- Flow A: 4 emails (days 1, 3, 6, 12) — nudges free users to publish
- Flow B: 3 emails (days 7, 21, 45) — nudges Basic → Pro upgrade
- Flow C: weekly career score (Pro), monthly views summary, renewal reminders
- Deduplication via `sent_flows` JSONB — each email sent exactly once
- One-click unsubscribe via base64url token

### Dashboard
- Edit all portfolio content (no AI call, direct DB update)
- Template switcher
- Analytics overview with unique visitors, bar chart, source breakdown
- Career score card
- Recent visitor activity feed

### SEO
- AI-generated `seo_title` and `seo_description` per portfolio
- Open Graph meta tags on all portfolio pages
- Blog with 5 SEO-targeted articles

### Security
- IP-based rate limiting on all sensitive endpoints
- HMAC verification on Paystack webhook
- `supabaseAdmin` (service role) server-side only — never in client bundle
- Row Level Security on all tables
- Automated daily health-check email to owner

---

## Architecture

```
Browser
  ↓
Caddy (port 80/443, auto-SSL) — 46.225.186.103
  ↓
Next.js app (port 3001)
  ↓
Supabase / OpenAI / Paystack / Resend
```

**Subdomain routing** — `middleware.ts` reads the `Host` header on every request:
- `liveportfolio.site` → main app (landing, form, dashboard, API)
- `liveportfolio.site/slug` → rewrites to `/portfolio/[slug]` (short links)
- `slug.liveportfolio.site` → rewrites to `/portfolio/[slug]`

---

## Project Structure

```
/
├── middleware.ts                        ← routing brain — do not break
├── app/
│   ├── page.tsx                         ← landing page
│   ├── create/page.tsx                  ← 4-step form
│   ├── preview/[portfolioId]/page.tsx   ← preview + payment
│   ├── portfolio/[slug]/page.tsx        ← public portfolio renderer
│   ├── dashboard/page.tsx               ← user dashboard (analytics, editing)
│   ├── blog/                            ← SEO blog articles
│   └── api/
│       ├── generate/route.ts            ← form data → AI → portfolio JSON
│       ├── parse-cv/route.ts            ← PDF → structured JSON
│       ├── update/route.ts              ← dashboard edits (no AI)
│       ├── paystack-webhook/route.ts    ← payment confirmation + plan upgrade
│       ├── subscribe/route.ts           ← capture non-paying user email
│       ├── check-slug/route.ts          ← real-time slug availability
│       ├── analytics/route.ts           ← view count (batch flush)
│       ├── analytics/event/route.ts     ← click event tracking
│       ├── analytics/summary/route.ts   ← dashboard analytics data
│       ├── score/route.ts               ← AI career score (7-day cache)
│       ├── unsubscribe/route.ts         ← one-click unsubscribe
│       ├── cron/drip/route.ts           ← email drip cron (CRON_SECRET protected)
│       ├── admin/metrics/route.ts       ← daily health-check data
│       ├── user-plan/route.ts           ← plan status check
│       ├── delete-account/route.ts      ← GDPR account deletion
│       └── health/route.ts              ← { status: 'ok' }
├── components/templates/
│   ├── Minimal.tsx                      ← editorial minimalism (white, teal accent)
│   └── Bold.tsx                         ← dark engineering showcase (navy, blue accent)
├── lib/
│   ├── supabase.ts                      ← client + admin instances
│   ├── prompts.ts                       ← AI system prompt + banned word list
│   ├── ipinfo.ts                        ← IPinfo Lite enrichment (company, country)
│   ├── email-drip.ts                    ← all email templates (Flow A, B, C)
│   └── schema.sql                       ← Supabase table definitions
├── scripts/
│   └── health-check.sh                  ← daily VPS health email
└── ecosystem.config.js                  ← PM2 config (port 3001)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Auth + plan (`unpublished` / `pro`) + slug |
| `portfolios` | Portfolio content (JSONB), health score, SEO fields, view count |
| `payments` | Payment records (Paystack reference, idempotency) |
| `subscriptions` | Recurring subscription tracking (basic / pro plan + expires_at) |
| `analytics_events` | Per-view and per-click events (ip_hash, company, country, referrer) |
| `career_scores` | AI career score cache (7-day TTL per portfolio) |
| `email_subscribers` | Drip email list + `sent_flows` JSONB deduplication |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | POST | AI portfolio generation (1 per user lifetime) |
| `/api/parse-cv` | POST | PDF → structured JSON |
| `/api/update` | PATCH | Dashboard content edits (no AI) |
| `/api/paystack-webhook` | POST | Payment confirmation, plan upgrade |
| `/api/subscribe` | POST | Capture non-paying user email |
| `/api/check-slug` | GET | Slug availability check |
| `/api/analytics` | POST | View count batch flush |
| `/api/analytics/event` | POST | Click event tracking |
| `/api/analytics/summary` | GET | Dashboard analytics (ownership-checked) |
| `/api/score` | GET | AI career score (7-day cache) |
| `/api/unsubscribe` | GET | One-click unsubscribe |
| `/api/cron/drip` | GET | Email drip runner (CRON_SECRET header) |
| `/api/admin/metrics` | GET | Health check metrics (ADMIN_METRICS_SECRET) |
| `/api/user-plan` | GET | Current plan status |
| `/api/delete-account` | POST | GDPR account deletion |
| `/api/health` | GET | `{ status: 'ok' }` |

---

## Local Setup

```bash
git clone https://github.com/cliffordnwanna/liveportfolio
cd liveportfolio
npm install
cp .env.local.example .env.local
# fill in your keys
npm run dev
```

---

## Environment Variables

```bash
NEXT_PUBLIC_ROOT_DOMAIN=liveportfolio.site
NEXT_PUBLIC_APP_URL=https://liveportfolio.site

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side only

OPENAI_API_KEY=

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=                # server-side only
NEXT_PUBLIC_USD_TO_NGN_RATE=1400

RESEND_API_KEY=
ADMIN_METRICS_SECRET=               # protects /api/admin/metrics
CRON_SECRET=                        # protects /api/cron/drip
IPINFO_TOKEN=                       # IPinfo Lite — 50k lookups/month free
```

---

## Deployment

Push to `main` → GitHub Actions:
1. Builds on GitHub CI (x86_64)
2. Rsyncs built output to VPS
3. Runs `npm install` on VPS (ARM64 native binaries)
4. Reloads PM2

**VPS:** 46.225.186.103 · **App port:** 3001 · **PM2 process:** `liveportfolio`

See [docs/VPS_Security_Runbook.md](docs/VPS_Security_Runbook.md) for security monitoring.

---

## Critical Rules

1. **One AI call per user, forever** — `/api/generate` checks DB before calling OpenAI. Never remove this check.
2. **`supabaseAdmin` is server-side only** — never import in client components or pages.
3. **App runs on port 3001** — UpJobs runs on 3000 on the same VPS.
4. **Caddy must pass Host header** — `header_up Host {host}` in Caddyfile. Without it, subdomain routing breaks.
5. **Dashboard edits use `/api/update`** — no AI, no cost. Never call `/api/generate` for edits.

---

## Pricing

| Plan | Price | Key features |
|------|-------|-------------|
| Launch | $9 one-time | Live portfolio, both templates, watermark removed |
| Professional | $19 one-time | Everything + custom domain |

Target: $300/month = ~16 Professional sales/month.

---

**Owner:** Clifford Nwanna / Ecotronics Enterprise, Lagos Nigeria  
**Domain:** liveportfolio.site (Namecheap, active until May 2027)
