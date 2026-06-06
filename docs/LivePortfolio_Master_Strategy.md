# LivePortfolio — Master Strategy & Implementation Guide
**Owner:** Chukwuma Clifford Nwanna · Ecotronics Enterprise  
**Last updated:** June 2026  
**Status:** App live · Hetzner VPS · Supabase (PostgreSQL) · Next.js · GPT-4o-mini · Resend  
**Goal:** First paying users → recurring revenue → $1k/mo → $5k/mo → $10k/mo  
**Framing:** AI career visibility system for job seekers — NOT a portfolio builder

---

## 1. WHAT WE ARE ACTUALLY BUILDING

### The winning framing (locked)
> **"AI career visibility system for job seekers."**

NOT "portfolio builder." NOT "portfolio website." Those are commodities.

The distinction drives everything:
- **Visibility** = ongoing value → users keep paying
- **Portfolio** = one-time artifact → users churn

You sell outcomes:
- "Am I getting noticed?"
- "Am I improving?"
- "Who is viewing me?"
- "Is my profile strong enough?"

### The product in one sentence
> "Build your AI career profile in 10 minutes. Know if recruiters are finding you."

### Definitive ICP (locked)

| Segment | Pain | Can Pay | Priority |
|---|---|---|---|
| Active job seekers | Extremely high — "not hearing back" | Medium | **PRIMARY** |
| Freelancers | High — need client credibility | High | **SECONDARY** |
| Students / NYSC / fresh grads | Very high — urgent | Low | ACQUISITION ONLY |
| Developers / designers | Medium — tools exist | High | LATER |

**Primary ICP:** Active job seekers in tech roles (dev, design, data, PM) applying
for roles and not hearing back. Nigeria, UK, US, English-speaking markets.
Urgent pain + clear solution = purchases happen.

---

## 2. PRICING MODEL (FINAL — LOCKED — DO NOT CHANGE WITHOUT DATA)

### Two plans only. No $5 one-time. No free publishing.

| Plan | Price | What they get |
|---|---|---|
| **Free** | $0 | Generate + preview ONLY. Portfolio saved privately. No editing. No publishing. No sharing. |
| **Basic** | **$9/year** | Publish + edit + up to 3 portfolios + subdomain (yourname.liveportfolio.site) |
| **Pro** | **$49/year** | Everything in Basic + analytics dashboard (views, company, country, referrer) + QR code sharing + weekly AI career score + custom domain + export pack (PDF, LinkedIn summary, cover letter) |

### The logic
- Free users see what they built but can't do anything with it until they pay.
  This is the emotional investment hook — they've already seen their portfolio,
  they want it live. The upgrade friction is low because value is already visible.
- $9/year is the "yes, obviously" decision. Core product, annual billing.
- $49/year is the power user / status upgrade. Custom domain alone justifies it.
- The email drip is the engine that moves users: Free → Basic → Pro.

### UI hierarchy rule (critical for Premium conversion)
```
[ FREE ]          Generate and preview. That's it.

BASIC             $9/year
   (Recommended)  Publish + edit + subdomain. The core product.

PRO               $49/year
   (Power Users)  Analytics + QR + career score + custom domain + export pack.
```
If Basic feels like "everything" and Pro feels like "optional extras,"
Pro will die. Basic must feel like the entry point. Pro must feel like
a status upgrade worth 5x the price. Enforce this in every UI decision.

### Annual billing rationale
Monthly subscriptions fail when the core action (build portfolio) is one-time.
Annual billing matches a job search duration (3–12 months). Feels like a domain
name: one payment, done, works all year. No month-to-month anxiety.

---

## 3. UNIT ECONOMICS (REAL — CALCULATED)

### AI cost at current GPT-4o-mini pricing ($0.15/$0.60 per million tokens)

| Action | Cost |
|---|---|
| Portfolio generation (one-time) | $0.0012 per user |
| Career score run (weekly, 4x/month) | $0.0025/month per Basic/Pro user |
| Monthly AI cost per paying user | ~$0.003/month |

### Gross margin at $9/year Basic

| Item | Monthly per user |
|---|---|
| Revenue | $0.75 |
| AI cost | $0.003 |
| Email (Resend) | $0.0005 |
| Infrastructure | ~$0.01 |
| **Gross margin** | **~$0.736 (98%)** |

### Scale scenarios

| Basic Users | Annual Revenue | Annual Cost | Profit | Margin |
|---|---|---|---|---|
| 50 | $450 | $8 | $442 | 98% |
| 200 | $1,800 | $31 | $1,769 | 98% |
| 500 | $4,500 | $79 | $4,421 | 98% |
| 1,000 | $9,000 | $157 | $8,843 | 98% |

AI costs are negligible at current scale. The risk is only at 10,000+ users
if usage per user grows. Set a monthly OpenAI spend alert from day one.
Track gross margin monthly in a simple spreadsheet.

---

## 4. THE FUNNEL

### Current state (confirmed)
- ✅ Full portfolio preview before payment
- ✅ Email collected at signup
- ✅ Paystack configured
- ✅ Resend working (health reports confirmed)
- ❌ No automated email drip
- ❌ No Basic/Pro subscription plans
- ❌ No analytics shown to users
- ❌ No career score
- ❌ No funnel event tracking

### Target funnel
```
User arrives → 4 questions → Email captured
        ↓
GPT-4o-mini generates portfolio → Full preview shown
("aha" — emotionally invested NOW, but can't use it)
        ↓
Dashboard: "Your portfolio is ready. Publish it."
Two options shown:
  ├─ Basic — $9/year (Recommended) → publish + edit + subdomain
  └─ Pro — $49/year → everything + analytics + score + custom domain
        ↓
If not paid: 7-day email drip (segmented)
        ↓
After payment: portfolio goes live + dashboard unlocks
        ↓
Weekly career score email + analytics notifications
→ retention → annual renewal
```

---

## 5. EMAIL STRATEGY (SEGMENTED — THREE FLOWS)

### Flow A: Free users who haven't published (convert to Basic)
The biggest revenue opportunity. These users have seen their portfolio.
They are emotionally invested. They just need a push.

| Day | Subject | Goal |
|---|---|---|
| 0 | "Your portfolio is ready 🎉" | Delight + immediate CTA to publish |
| 1 | "3 people previewed portfolios today. Yours isn't live yet." | Social urgency |
| 3 | "You're one click away from going live" | Soft push |
| 5 | "Recruiters can't find you yet — your portfolio isn't public" | Pain |
| 7 | "Last chance — your portfolio preview expires today" | Hard deadline |
| 10 | "Your portfolio is still waiting (we saved it)" | Reactivation |

CTA in every email: **"Publish my portfolio — $9/year"**

### Flow B: Basic users ($9/year) — upgrade to Pro
Trigger after they've experienced the analytics dashboard for 14–30 days.

| Day after Basic purchase | Subject | Goal |
|---|---|---|
| 7 | "Your portfolio is live — here's what to do next" | Onboard, surface Pro value |
| 21 | "Want your own domain? cliffordnwanna.com instead of a subdomain?" | Tease Pro |
| 45 | "Upgrade to Pro — your own domain + 3 portfolios + full export pack" | Convert |

CTA: **"Upgrade to Pro — $49/year"**

### Flow C: Pro/Basic users — retention (prevent churn at renewal)
| Trigger | Email | Goal |
|---|---|---|
| Weekly | "Your career score this week: X/100 [+3 from last week]" | Habit |
| On new visit | "Someone from [Company] viewed your portfolio" | Dopamine loop |
| Monthly | "Your portfolio got N views last month" | Demonstrate value |
| 30 days before renewal | "Your plan renews in 30 days — here's your year in review" | Reduce churn |
| Failed payment | "Your portfolio is about to go offline" | Dunning |

---

## 6. THE RETENTION ENGINE

### Why retention is the existential challenge
Portfolio tools are naturally single-use. Build once, leave forever.
Without deliberate retention design, you have a one-time utility dressed as a SaaS.

### The three retention loops

**Loop 1: External attention — "Who is viewing me?" (MOST POWERFUL)**
This is the daily-return trigger. Everything else is secondary.
Users check this the same way they check LinkedIn notifications.
- Portfolio view count (daily, 7-day, 30-day)
- Visitor company identification ("Someone from Flutterwave viewed your portfolio")
- Click-through tracking (GitHub, LinkedIn, CV download)
- Country / referrer breakdown

**Build this first in Phase 2. If analytics is weak, everything collapses.**

**Loop 2: Internal improvement — "Am I getting better?"**
Drives weekly re-engagement. Users edit their portfolio to improve their score.
- Career score (0–100) updated weekly by GPT-4o-mini
- Score trend (improving/declining)
- Three specific, actionable suggestions
- Score improvement celebrated via email

**Loop 3: Career uncertainty — "Is my profile strong enough?"**
Job searching is anxious. LivePortfolio becomes the tool they check when the
anxiety peaks. This loop exists naturally — you just need to be present for it.

### Recruiter Activity Simulation (the most important single feature for retention)
> "Someone from Flutterwave viewed your portfolio"
> "Your portfolio link was clicked from LinkedIn"

**Implementation:** Track IP + referrer on every public portfolio view.
Use IPinfo.io free tier (50,000 lookups/month — sufficient at early scale)
to identify company domain. Display as activity feed in dashboard.

**Why it works:** Even imperfect data creates the dopamine loop that brings
users back daily. Exactly like LinkedIn's "X people viewed your profile."

**Privacy note:** Display company domain only (not individual names). Add to
Privacy Policy: "We collect visitor IP addresses to provide portfolio analytics.
IP data is processed to identify approximate company affiliation. Raw IPs are
hashed and not stored."

---

## 7. FEATURE ROADMAP (EXACT BUILD ORDER)

### Phase 0: Legal + alignment fixes (IN PROGRESS — do before launch)
- ⬜ Remove $5 one-time from Paystack and codebase (BREAKING — careful)
- ⬜ Add Basic ($9/yr) and Pro ($49/yr) Paystack subscription plans
- ⬜ Refund policy: 7-day no-questions (Terms §5)
- ⬜ Software-tool disclaimer in Terms §1
- ⬜ NDPA reference in Privacy Policy
- ⬜ Paystack webhook hardened (fail on missing env var)
- ⬜ Contact email: support@ecotronicsenterprise.com throughout

### Phase 1: Revenue unlock (THIS WEEKEND — additive, non-breaking)

**Step 1: Create Paystack subscription plans**
Do this in the Paystack dashboard FIRST before touching code:
- Create "LivePortfolio Basic" plan: $9/year, recurring
- Create "LivePortfolio Pro" plan: $49/year, recurring
- Note the plan codes — you'll need them in the code

**Step 2: Add subscriptions table to Supabase**
```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('basic', 'pro')),
  status TEXT CHECK (status IN ('active', 'inactive', 'cancelled')),
  paystack_subscription_code TEXT,
  paystack_customer_code TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON subscriptions(user_id);
```

**Step 3: Claude Code prompt for Phase 1**
```
Read the LivePortfolio codebase thoroughly first. Understand the existing 
Paystack integration, auth system, and database schema. Then:

Add subscription support with these EXACT changes — nothing else:

1. Add the subscriptions table (migration provided above)

2. Create a utility function: getUserPlan(userId) 
   → returns 'free' | 'basic' | 'pro'
   Checks subscriptions table for active subscription.
   Free = no active subscription.

3. Update the Paystack webhook handler to handle subscription events:
   - subscription.create → insert into subscriptions
   - charge.success (recurring) → extend expires_at
   - subscription.disable → update status to 'cancelled'
   DO NOT remove existing charge.success handling for one-time payments
   during this transition — keep both working until $5 is removed separately.

4. Update the publish flow:
   - Check getUserPlan() before allowing publish
   - If 'free': show upgrade modal with two options:
     ⭐ Basic — $9/year (Recommended) — Publish + analytics + career score
     👑 Pro — $49/year — Everything + custom domain + multi-portfolio
   - If 'basic' or 'pro': allow publish (existing flow)

5. Add a pricing page / section to the landing page with the exact
   UI hierarchy (see master doc Section 2). Basic = recommended/core.
   Pro = power user / status upgrade. Annual billing only.

6. Add an upgrade prompt inside the free user dashboard:
   "Your portfolio is ready. Publish it and start tracking who finds you."
   CTA: two buttons — Basic $9/yr and Pro $49/yr.

RULES:
- DO NOT remove the $5 flow yet — that is a separate task
- DO NOT change any existing portfolio generation or AI logic
- DO NOT change any styling outside the new upgrade UI
- Show me the migration SQL and every changed file with diffs
- Do not deploy until I review and approve
```

### Phase 2: Retention foundation (WEEK 1 — most important)

**Priority order within Phase 2:**
1. Analytics dashboard + visitor tracking (BUILD FIRST — survival feature)
2. Recruiter activity feed ("Someone from X viewed you")
3. Career score engine (weekly GPT-4o-mini scoring)
4. Email drip sequences (all three flows)

**Analytics Claude Code prompt:**
```
Add portfolio analytics to LivePortfolio. Gate behind Basic/Pro plan.

1. Create analytics_events table:
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id),
  event_name TEXT,
  session_id TEXT,
  referrer TEXT,
  company TEXT,
  country TEXT,
  device TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

2. On every public portfolio page load (server-side):
   - Fire portfolio_view event
   - Look up company from IP using IPinfo.io API (add IPINFO_TOKEN to .env)
   - Store hashed IP, company, country, referrer, device
   - Also track: github_click, linkedin_click, cv_download on button clicks

3. Add Analytics tab to dashboard (Basic/Pro users only):
   - Total views: today / 7 days / 30 days / all time
   - Recent activity feed: "[time] · [Company or Country] · [referrer]"
   - Format company visits as: "Someone from [Company] viewed your portfolio"
   - Top referrers (LinkedIn, direct, etc.)
   - Simple view count chart (last 14 days, bar chart using existing Chart.js)

4. For Free and Basic users: show locked Analytics tab with blur overlay
   "See who's viewing your portfolio — upgrade to Pro ($49/year)"

5. Add IPINFO_TOKEN to .env.example with instructions.

RULES: Additive only. No changes to existing portfolio logic.
Show migration and all diffs. Do not deploy.
```

**Career Score prompt:**
```
Add AI career scoring to LivePortfolio using GPT-4o-mini.

Scoring prompt to use:
"You are a senior technical recruiter. Score this portfolio out of 100.
Return JSON only:
{
  'total': 72,
  'clarity': 18,
  'projects': 16,
  'skills': 20,
  'recruiter': 18,
  'suggestions': ['suggestion 1', 'suggestion 2', 'suggestion 3'],
  'summary': 'One sentence summary.'
}
Dimensions (0-25 each):
- clarity: value proposition clear in 5 seconds?
- projects: specific, measurable, impressive?
- skills: relevant, current, well-presented?
- recruiter: would you shortlist this person?
Portfolio: [JSON]"

Implementation:
1. Create career_scores table (portfolio_id, score JSON, created_at)
2. /api/score endpoint: fetch portfolio → score via GPT-4o-mini → store result
3. Score card in dashboard: circular score display + 3 suggestions
4. Cron job: re-score all active Basic/Pro portfolios weekly, email result
   via Resend with subject "Your career score this week: X/100"
5. Gate behind Basic/Pro. Free users see locked card: "Upgrade to see
   your career score and how to improve it."

Show all diffs. No deploy.
```

### Phase 3: Pro differentiation (WEEK 2–3)

**Custom domain (CNAME via Caddy):**
- Add custom_domain column to portfolios
- Settings page for Pro users: enter domain → show DNS instructions
- /api/verify-domain: check CNAME resolution
- Update Caddy config to route custom domains to correct portfolio

**Multi-portfolio (up to 3 for Pro):**
- Allow user_id → multiple portfolio rows
- Toggle "active" portfolio (the public one)
- Each portfolio can have different template/archetype

**Dynamic Layout Engine (replaces static templates):**
Instead of selecting a template, AI assembles the best layout:
- 8 archetypes: Developer, Designer, Data, Product, Student, Freelancer,
  Researcher, Executive
- AI selects archetype based on role + experience level
- Then assembles sections (hero, projects, skills, experience, contact)
  and blocks within each section dynamically
- Infinite variety without template maintenance

### Phase 4: Growth (MONTH 2)
- Export Pack: PDF + LinkedIn summary + cover letter (Puppeteer + GPT-4o-mini)
- Job match alerts: notify users of roles matching portfolio skills
- Referral system: "Refer a friend, get 1 month free"
- Testimonials on landing page

---

## 8. CODEBASE REVIEW PROMPT (run this first)

```
Read the entire LivePortfolio codebase. Produce a structured report:

1. DATABASE SCHEMA
   Every Supabase table with columns and types.
   How users, portfolios, and payments are currently modelled.
   Does a subscriptions table already exist?

2. CURRENT FUNNEL
   Exact path from landing page → generation → payment → publish.
   Which file handles each step. Where email is collected.

3. PAYMENT FLOW
   How does Paystack work currently? One-time only?
   Where is the webhook handler? What events does it handle?
   How are paid vs free users currently distinguished?

4. EMAIL SETUP
   What Resend emails currently exist and when do they fire?
   Any drip or sequence logic already in place?

5. AUTH
   How is authentication handled?
   What does the session/user object contain?

6. FASTEST PATH TO PHASE 1
   What is needed to add Basic/Pro subscription tiers?
   What can be done additively without touching existing payment flow?
   Any technical debt or risks to flag before we add features?

Output structured markdown. Do not change any files.
```

---

## 9. COMPETITIVE POSITIONING

| Competitor | Price | LivePortfolio advantage |
|---|---|---|
| Kickresume | $8–19/mo | 10x cheaper, has career intelligence they lack |
| Enhancv | $15–25/mo | Resume-focused, no analytics, no recruiter visibility |
| Rezi | $29/mo | ATS only, no portfolio, no visitor tracking |
| FlowCV | Free–$8/mo | No AI, no analytics, commodity templates |
| Notion/Carrd | Free–$8/mo | Manual build, no AI generation, no intelligence |

**Position:** Cheapest AI career visibility tool with real recruiter analytics.
$9/year. Dramatically cheaper than all competitors while offering the
intelligence layer none of them provide at this price.

**Tagline:** *"Your AI career profile. Know you're being noticed."*

---

## 10. ACQUISITION ($0 SPEND THIS WEEKEND)

### The rule
Ads amplify what's working. You have zero conversion data.
Every hour this weekend goes into direct outreach.

### The offer that converts
> "I'll build your portfolio free in exchange for honest feedback and a testimonial."

### Where to find leads
- **LinkedIn:** Search "open to work" + dev/design/PM/data. Personal DMs.
- **Twitter/X:** Search "looking for work" + target roles.
- **Reddit:** r/cscareerquestions, r/forhire. Value-post first, mention softly.
- **WhatsApp:** Your personal network. Highest conversion of all channels.

### DM template (personalise every single one)
```
Hi [Name],

Saw your post about [their specific situation].

I built an AI tool that turns your experience into a recruiter-ready 
portfolio in 5 minutes. Looking for honest feedback from real job seekers.

Want me to build yours free in exchange for a 10-minute chat about 
what you think?

[Your name] · liveportfolio.site
```

### Convert free users to paid
```
"Glad you like it. Have you shared it yet? 

I'm launching this week — $9/year to publish it and start tracking 
who finds you. As an early user I'd love for you to be one of the 
first. No pressure either way."
```

### Content to post ($0 cost)
- **LinkedIn:** Build-in-public launch post. Real story. Free offer for first 20.
- **Twitter/X:** 5-tweet thread. Pain → build → product → offer → link.
- **Reddit:** Genuine value post. Soft product mention.
- **WhatsApp:** 80 words. Personal. The offer.

---

## 11. METRICS (update ADMIN/modules/traction/metrics.json weekly)

| Metric | Week 1 | Month 1 | Month 3 |
|---|---|---|---|
| Paying users (Basic + Pro) | 10 | 50 | 200 |
| Basic ($9/yr) subscribers | 8 | 40 | 160 |
| Pro ($49/yr) subscribers | 2 | 10 | 40 |
| Monthly revenue equivalent | $14 | $90 + $40 = $130 | $520/mo |
| Email list (free users) | 50 | 200 | 1,000 |
| Free → Basic conversion | — | measure | target >10% |
| Basic → Pro upgrade | — | measure | target >15% |
| Annual renewal rate | — | — | target >80% |
| OpenAI monthly spend | track | <$5 | <$20 |
| Gross margin | — | — | >95% |

**The gate:** 50 paying users. At 50, launch the full public product and 
content marketing. Until 50, outreach is the primary channel.

---

## 12. OPEN ITEMS

| Item | Priority | Status |
|---|---|---|
| Remove $5 one-time (separate task, careful) | HIGH | Planned |
| Create Basic + Pro Paystack plans | BLOCKER | Do first |
| Confirm Creative template is live | HIGH | Check live product |
| Confirm payment processor (Paystack or Lemon Squeezy) | HIGH | Check code |
| Do applications stay in-app or redirect? | HIGH | Check code |
| TIN confirmed + submitted to Paystack | HIGH | ✅ Done |
| Paystack international payments | HIGH | ✅ Submitted |
| CAC annual returns 2023/24/25 | MEDIUM | Founder action |
| CRON_SECRET rotated in UpJobs | BLOCKER | Claude Code |
| Funnel instrumentation | HIGH | Phase 1 |
| OpenAI spend alert configured | HIGH | Do immediately |

---

## 13. THE NORTH STAR (ONE PARAGRAPH)

LivePortfolio is an AI career visibility system for active job seekers —
people applying everywhere and hearing nothing back. The product:

**Free (generate + preview only) → email drip → Basic $9/year (publish +
edit + subdomain) → Pro $49/year (analytics + career score + QR + custom
domain + multi-portfolio + export pack)**

Two plans. Annual billing. No one-time options. The email funnel moves users
through the three stages. The retention engine is the analytics dashboard —
specifically "who is viewing me" — which must be built first in Phase 2 because
it is the only feature that creates daily return visits. The gross margin is 98%.
The pricing is deliberately cheap to win market share. Nothing in the roadmap
matters until 10 real paying users validate the model. Get those first. Then build.
