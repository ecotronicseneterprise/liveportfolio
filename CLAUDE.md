# liveportfolio.site — Claude Code Project Context

## What This Project Is

An AI-powered portfolio generation platform. Users fill a 4-step form, one GPT-4o-mini
call generates all portfolio copy as structured JSON, a live preview renders in-browser,
and a one-time payment publishes the portfolio permanently at slug.liveportfolio.site.

**Owner:** Clifford Nwanna / Ecotronics Enterprise  
**Domain:** liveportfolio.site (Namecheap, active until May 2027)  
**VPS:** 46.225.186.103 — ssh deploy@46.225.186.103  
**App port:** 3001 (UpJobs runs on 3000 — never use 3000)  
**Stack:** Next.js 15, TypeScript, Supabase, OpenAI GPT-4o-mini, Lemon Squeezy, Resend, PM2, Caddy

---

## Core Architecture

```
Browser
  ↓
Caddy (port 80/443, auto-SSL) on 46.225.186.103
  ↓
Next.js app (port 3001)
  ↓
Supabase (DB + Auth + Storage) / OpenAI / Lemon Squeezy / Resend
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
│       ├── parse-cv/route.ts      ← PDF → structured JSON
│       ├── generate/route.ts      ← THE CORE: form data → AI → portfolio JSON
│       ├── check-slug/route.ts    ← Real-time slug availability
│       ├── webhook/route.ts       ← Lemon Squeezy payment confirmation
│       ├── subscribe/route.ts     ← Capture non-paying user email
│       ├── analytics/route.ts     ← Portfolio view counting
│       └── health/route.ts        ← {status: 'ok'}
├── components/
│   └── templates/
│       ├── Minimal.tsx            ← Template 1: editorial minimalism
│       └── Bold.tsx               ← Template 2: dark engineering showcase
├── lib/
│   ├── supabase.ts                ← Client + admin instances
│   ├── prompts.ts                 ← AI system prompt + banned word list
│   └── schema.sql                 ← Supabase table definitions
└── ecosystem.config.js            ← PM2 config (port 3001, cluster mode)
```

---

## Database Schema (Supabase)

### users
| column | type | notes |
|--------|------|-------|
| id | uuid PK | references auth.users |
| email | text unique | login email |
| slug | text unique | → slug.liveportfolio.site |
| plan | text | 'unpublished' \| 'launch' \| 'professional' |
| published_at | timestamptz | null until payment |
| custom_domain | text | professional plan only |
| ls_customer_id | text | Lemon Squeezy |

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
| og_image_url | text | Playwright screenshot URL |
| view_count | integer | batch-flushed from memory |

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

### payments
`id, user_id, ls_order_id (unique — idempotency), product_tier, amount_cents, created_at`

### email_subscribers
`id, email (unique), user_id, portfolio_og_url, source, subscribed, sequence_step, created_at`

---

## Environment Variables

```bash
NEXT_PUBLIC_ROOT_DOMAIN=liveportfolio.site
NEXT_PUBLIC_APP_URL=http://46.225.186.103     # update to https once SSL added

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=               # safe to expose to client
SUPABASE_SERVICE_ROLE_KEY=                   # SERVER SIDE ONLY — never in client bundle

OPENAI_API_KEY=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LEMON_SQUEEZY_API_KEY=
RESEND_API_KEY=
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

```
User clicks "Publish — $19"
  ↓
Lemon Squeezy overlay (stays on liveportfolio.site — no redirect)
  ↓
User pays
  ↓
LS fires POST to /api/webhook
  ↓
/api/webhook:
  1. Verify HMAC signature (X-Signature header)
  2. Check ls_order_id not already in payments table (idempotency)
  3. Find user by email from LS order
  4. Set users.plan = 'launch' or 'professional'
  5. Set users.published_at = now()
  6. Insert into payments table
  7. Send Resend confirmation email
  ↓
Supabase Realtime pushes plan update to client
  ↓
Client removes watermark — portfolio is live (no page reload)
```

**Webhook always returns 200.** Lemon Squeezy retries on non-200.
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

## Banned Slugs

These slugs must be blocked in `/api/check-slug`:
`api, www, app, admin, blog, help, dashboard, status, support, login, signup,
register, pricing, about, contact, terms, privacy, docs, faq, team, careers,
demo, test, null, undefined, liveportfolio`

---

## Deployment

### VPS Details
- IP: 46.225.186.103
- User: deploy
- SSH: `ssh deploy@46.225.186.103`
- App directory: `/home/deploy/apps/liveportfolio`
- App port: 3001
- PM2 process name: `liveportfolio`

### Deploy command (after pushing to GitHub)
```bash
ssh deploy@46.225.186.103
cd /home/deploy/apps/liveportfolio
sh deploy.sh
```

### deploy.sh does:
git pull → npm install → npm run build → pm2 reload liveportfolio

### PM2 commands
```bash
pm2 list                          # see all running processes
pm2 logs liveportfolio --lines 50 # read app logs
pm2 restart liveportfolio         # restart (brief downtime)
pm2 reload liveportfolio          # zero-downtime reload
pm2 stop liveportfolio            # stop
```

### Caddy config location
`/etc/caddy/Caddyfile`

### Key Caddy line (never delete from the liveportfolio.site block)
`header_up Host {host}`

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
