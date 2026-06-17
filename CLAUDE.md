# liveportfolio.site — Claude Code Project Context

## What This Project Is

An AI-powered portfolio generation platform. Users fill a 4-step form, one GPT-4o-mini
call generates all portfolio copy as structured JSON, a live preview renders in-browser,
and a one-time payment publishes the portfolio permanently at slug.liveportfolio.site.

**Owner:** Clifford Nwanna / Ecotronics Enterprise  
**Domain:** liveportfolio.site (Namecheap, active until May 2027)  
**VPS:** 46.225.186.103 — ssh deploy@46.225.186.103  
**App port:** 3001 (UpJobs runs on 3000 — never use 3000)  
**Stack:** Next.js 15, TypeScript, Supabase, OpenAI GPT-4o-mini, Paystack, Resend, IPinfo, PM2, Caddy

---

## Core Architecture

```
Browser
  ↓
Caddy (port 80/443, auto-SSL) on 46.225.186.103
  ↓
Next.js app (port 3001)
  ↓
Supabase (DB + Auth + Storage) / OpenAI / Paystack / Resend / IPinfo
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
| template | text | 'minimal' \| 'bold' |
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

Payment processor: **Paystack** (not Lemon Squeezy — that was removed).
Webhook endpoint: `/api/paystack-webhook`

### Testing Payments (without touching real plan prices)

A hidden ₦500 test plan exists for verifying the full payment flow end-to-end.

**How to trigger it:**
1. Go to any preview page and append `?test=1` to the URL:
   `https://liveportfolio.site/preview/YOUR_PORTFOLIO_ID?test=1`
2. Click "Publish" → modal opens → click **[TEST] Pay ₦500** at the bottom
3. Pay with real card — Paystack fires webhook → Supabase updates → email sends
4. Verify `users.plan = 'basic'` in Supabase

**Test plan details (live mode):**
- Plan code: `PLN_gzi13ks4vajcdhx`
- Amount: ₦500 monthly
- Defined in: `components/UpgradeModal.tsx` → `TEST_PLAN_CODE`
- Visibility: only shown when `?test=1` is in URL — never visible to real users

**After testing:** manually reset the test user's plan back to `unpublished` in Supabase
if you want to reuse the same account for another test.

**Key env vars (baked into build at compile time — must match):**
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — live: `pk_live_...`, must match `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_PAYSTACK_BASIC_PLAN_CODE` — `PLN_xsu4j4jyxo67pe1`
- `NEXT_PUBLIC_PAYSTACK_PRO_PLAN_CODE` — `PLN_npgms123sd8z2jc`
- `NEXT_PUBLIC_` vars are baked in at **build time** by GitHub Actions — changing `.env.local` on VPS alone is NOT enough. Must update GitHub Actions secrets + redeploy.

**Caddy note:** `X-Frame-Options` must NOT be `SAMEORIGIN` on liveportfolio.site block — Paystack uses an iframe. Current setting: `ALLOWALL`.

```
User clicks "Publish"
  ↓
Paystack popup (stays on liveportfolio.site — no redirect)
  ↓
User pays
  ↓
Paystack fires POST to /api/paystack-webhook
  ↓
/api/paystack-webhook:
  1. Verify HMAC signature (x-paystack-signature header, sha512)
  2. Check reference not already in payments table (idempotency)
  3. Find user by user_id from metadata
  4. Set users.plan = 'pro'
  5. Set users.published_at = now()
  6. Insert into payments table
  7. Send Resend confirmation email
  ↓
Supabase Realtime pushes plan update to client
  ↓
Client removes watermark — portfolio is live (no page reload)
```

**Webhook always returns 200.** Paystack retries on non-200.
If there's an error processing, log it but still return 200.

---

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
- IP: 46.225.186.103
- User: deploy
- SSH: `ssh deploy@46.225.186.103`
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

### PM2 commands
```bash
pm2 list                                    # see all running processes
pm2 logs liveportfolio --lines 50 --nostream # read app logs
pm2 startOrReload ecosystem.config.js --env production --update-env  # reload with env
pm2 restart liveportfolio                   # hard restart (brief downtime)
pm2 stop liveportfolio                      # stop
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

## Templates

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
