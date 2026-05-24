LIVEPORTFOLIO.SITE
Product Requirements Document — v2.1
Final Build-Ready Version  —  All decisions locked  —  Start building
Ecotronics Enterprise  —  Clifford Nwanna  —  May 2026
Domain: liveportfolio.site (registered Namecheap, active until May 2027)
Product in One Sentence
An AI-powered platform at liveportfolio.site that generates a professional, live-hosted portfolio for any tech or creative professional in under 5 minutes. Users fill a guided 4-step form, one AI call generates all copy as structured JSON, the full portfolio is previewed in-browser, and unlocked permanently with a one-time payment. Published portfolios live at slug.liveportfolio.site. Non-paying users enter an automated email sequence that serves as both the conversion engine and the product newsletter.
v2.1 Additions over v2.0
•	Screenshot generation pipeline added to Day 6 build tasks
•	Portfolio health score / completion prompt added to preview screen spec
•	Template quality acceptance criteria codified with measurable standards
•	AI banned vocabulary list added to generation pipeline spec
•	Generation SLA tiers defined with degradation responses
•	Email list long-term platform asset value documented
•	Recruiter discovery layer added to Month 6+ roadmap
•	Brand positioning statement locked: career acceleration, not portfolio builder
•	All URLs updated to liveportfolio.site and slug.liveportfolio.site throughout


Table of Contents
1.   Project Overview & Goals
2.   Brand Positioning (Locked)
3.   Target Users & Personas
4.   Core Product Decisions
5.   Full Feature Specification
6.   User Flow — Every Screen & State
7.   Email Conversion Engine & Newsletter Asset
8.   Technical Architecture
9.   Database Schema
10. API Specification
11. AI Generation Pipeline
12. Screenshot Generation Pipeline
13. Portfolio Health Score
14. Template Quality Standards
15. Pricing & Monetisation
16. Infrastructure & DevOps
17. Security & Abuse Prevention
18. Marketing & Distribution
19. Economics & Cost Model
20. Launch Plan — 14-Day Build Sprint
21. Post-Launch Roadmap
22. Constraints & Non-Goals
23. Success Metrics


1. Project Overview & Goals
Problem Statement
Millions of tech professionals and career switchers globally — and specifically across Africa — need a professional online portfolio to get hired. The barrier is not skill. It is that they do not know how to build one, do not know what to write, and cannot afford expensive platforms or monthly subscriptions. Existing tools require design knowledge, take hours, and cost $15–49/month. GitHub Pages requires coding. No product takes a person from zero to a live professional portfolio in under 5 minutes with AI-generated copy for a one-time affordable payment.
Solution
A guided AI portfolio generation platform at liveportfolio.site. User fills a 4-step form, optionally uploads their CV to pre-fill it, one AI call generates all portfolio copy as structured JSON, a full preview renders in the browser, user pays once — portfolio goes permanently live at slug.liveportfolio.site. No design skill, no coding, no monthly fees.
Primary Goals
•	Generate $300/month within 6 months of launch
•	Achieve 16 paying customers/month at $19/sale (Professional plan)
•	Keep infrastructure cost under $10/month until 50 paying users
•	Build a compounding distribution loop via 'Built with liveportfolio.site' on all published portfolios
•	Launch v1 MVP within 14 days from build start
•	Build an email list of 10,000 high-intent African tech professionals within 18 months
North Star Metrics
Metric	Month 1	Month 3	Month 6	Month 18
Paying customers/mo	4+	16+	34+	100+
Monthly revenue	$76+	$180+	$300+	$1,200+
Email subscribers	50+	300+	800+	10,000+
Email-to-paid rate	baseline	5%+	8%+	10%+
Portfolio views/day	10+	100+	400+	2,000+
Generation time	<6s	<5s	<4s	<4s


2. Brand Positioning (Locked)
v2.1 ADDITION: Section added in v2.1. Positioning statement and banned language codified here.

Core Positioning Statement
We help tech professionals compress professional legitimacy into 5 minutes.
The product sells confidence and identity transformation, not a website. Users are not buying HTML. They are buying perceived employability, social proof, and the version of themselves that gets hired.

Approved Taglines (use one consistently)
•	"The fastest way to look hireable online."
•	"Your professional presence in 5 minutes."
•	"From bootcamp to professional portfolio tonight."
•	"Paste your info. Go live in minutes."
Banned Positioning Language
Never use these terms in marketing copy, landing pages, email subject lines, or product UI:
•	AI portfolio builder — undersells the transformation
•	Website builder — wrong category entirely
•	Portfolio generator — makes it sound like a commodity
•	Portfolio tool / platform / maker — too generic
The word 'portfolio' is acceptable in context but must always be paired with transformation language: 'live professional portfolio', 'portfolio that gets you hired', not just 'portfolio'.
The Emotional Purchase
The user's real purchase is the moment on the preview screen when they see their name, their projects transformed into case studies, and their story written professionally. That is the 'damn, this actually looks like me' moment. Every product and marketing decision must be evaluated against whether it accelerates or delays this moment.


3. Target Users & Personas
Primary — The Career Switcher
Name	Adaeze, 26, Lagos Nigeria
Situation	Completed a data analytics bootcamp. Has 3 projects. Applying for remote jobs globally.
Pain	Needs a portfolio. No idea where to start. Wix is too complex and expensive.
Goal	A live link she can paste into every job application that makes her look credible tonight.
Pay behaviour	Will pay $5–19 one-time if she sees the output first. Will not pay before seeing result.
Conversion trigger	Preview screen. Seeing her name and projects transformed professionally.
Template preference	Minimal — clean and professional, not flashy.

Secondary — The Developer
Name	Emeka, 29, Accra Ghana
Situation	Self-taught frontend dev. Has GitHub. Applying to remote roles at European startups.
Pain	GitHub profile is bare. Keeps procrastinating on a portfolio site.
Goal	Something live tonight that looks as credible as developers he sees on LinkedIn.
Pay behaviour	Will pay $10–20 one-time if quality is high. Will judge template quality critically.
Conversion trigger	Template quality. If it looks like a Framer or Vercel showcase portfolio, he pays.
Template preference	Bold or Creative — he wants something that stands out technically.

Tertiary — The Creative
Name	Tobi, 24, Nairobi Kenya
Situation	UI/UX designer. Has Behance but needs a standalone portfolio link for job applications.
Pain	Behance is cluttered. Wants a clean page she controls.
Goal	A minimal, elegant portfolio she can share with confidence with design agencies.
Pay behaviour	$10–15 one-time. Template aesthetics are the purchase trigger.
Conversion trigger	Creative template visual quality. Must look like a designer built it.
Template preference	Minimal or Creative with strong typography.


4. Core Product Decisions (All Locked)
Decision 1 — Build → Preview → Pay → Live
The user flow: fill form → AI generates → user sees full portfolio preview → pays → portfolio goes live at slug.liveportfolio.site. No free tier. No expiry timer. The preview IS the sales page. Seeing their name, their projects as case studies, and their story written professionally is the moment the sale happens emotionally before payment happens technically.
v2.1 CHANGE: 7-day free expiry model removed entirely. No countdown timers, no expiry messaging.

Decision 2 — Non-payers enter the email conversion engine
Users who reach the preview but do not pay are captured in the email system. Weekly emails with their portfolio screenshot, value content (portfolio tips, hiring guides), and a 'Publish it now — $19' CTA. This sequence is the conversion engine, the newsletter, and the brand advertising channel simultaneously.
Decision 3 — Single AI call, result stored permanently
One GPT-4o-mini call per user. Full portfolio JSON returned in one structured response. Saved to Supabase permanently. AI never called again. This is the only architecture that makes a one-time payment economically viable: cost front-loaded once, never repeated.
v2.1 CHANGE: 4 parallel AI chains replaced with 1 structured JSON call with response_format: json_object.

Decision 4 — Hosted subdomains, not ZIP downloads
Every paid portfolio lives permanently at slug.liveportfolio.site. The hosted URL is the marketing asset. Every time a user shares their link in a job application, on LinkedIn, or on WhatsApp, the 'Built with liveportfolio.site' footer creates a product impression. ZIP files on hard drives do not.
Decision 5 — No drag-and-drop editor
Templates are opinionated. Users switch between 3 templates instantly (same JSON, different component). Text editable via structured form fields. No canvas, no block system, no drag-and-drop. Support burden stays zero.
Decision 6 — One-time payment, no subscriptions
$9 Launch and $19 Professional, both one-time. Portfolios are static JSON-rendered pages costing cents per month to serve. This model fits the target market perfectly and removes churn as a business variable entirely.
Decision 7 — Cloudflare SSL, not Certbot
Cloudflare Origin Certificate installed on VPS covers liveportfolio.site and *.liveportfolio.site for 15 years. Zero renewal complexity. SSL mode: Full (strict). Wildcard A record in Namecheap DNS pointed to Hetzner VPS IP, proxied through Cloudflare.
v2.1 CHANGE: Certbot / Let's Encrypt approach dropped. Cloudflare Origin Certificate is simpler, more reliable, zero maintenance.

Decision 8 — 2 elite templates before 3 mediocre ones
Launch with 2 templates that pass the Framer screenshot test. Ship template 3 in month 2 after user feedback. Template quality is existential — it is not a UI detail, it is the product.
v2.1 ADDITION: Added in v2.1 based on review feedback: quality over quantity is explicit policy.


5. Full Feature Specification
5.1 Landing Page (liveportfolio.site)
•	Hero: headline from approved tagline list, subheadline: 'Fill in your info. We write the copy. Your portfolio goes live in minutes.', single CTA: 'Create My Portfolio'
•	3 live portfolio examples as clickable links (slug.liveportfolio.site URLs, not screenshots)
•	Before/after section: raw GitHub/LinkedIn profile vs generated portfolio
•	How it works: 3 steps — Fill your info, AI writes the copy, Go live instantly
•	Pricing: $9 Launch vs $19 Professional, one-time, clear comparison table
•	Social proof: early user quotes once available from beta users
•	FAQ: 6 questions — Can I preview before paying? (yes) | Is hosting permanent? (yes) | Can I edit? (yes) | Custom domain? (Professional only) | Refund? (7-day) | Who is this for? (tech + creative professionals)
•	Footer: 'Built with liveportfolio.site' example link
•	Mobile-first. Target load: under 1.5 seconds. No JavaScript-heavy animations above the fold.
5.2 Form — Step 1: Your Basics
•	Fields: Full name (required, max 80 chars), Professional title (required, max 80 chars), Email (required), City and country, Short bio (optional, max 500 chars — AI generates if empty)
•	CV upload (optional, PDF only, max 5MB) — triggers /api/parse-cv, pre-fills all steps on success
•	GitHub URL (optional), LinkedIn URL (optional)
•	Profile photo upload (optional, JPEG/PNG, max 2MB, resized to 400×400 server-side via sharp)
•	All character limits enforced at both frontend (live counter) and backend (hard cap)
•	Progress bar: 1/4 — 25%
5.3 Form — Step 2: Your Projects
•	Minimum 1 project, maximum 4 projects
•	Per project: title (max 80 chars), one-line description of what it does (max 200 chars, character counter shown), tech stack comma-separated (max 150 chars), live URL or GitHub link (optional)
•	Helper text: 'Keep this short — AI will expand this into a full case study'
•	'Add project' and 'Remove' buttons
•	Progress bar: 2/4 — 50%
5.4 Form — Step 3: Choose Your Template
•	2 templates at launch: Minimal, Bold. Template 3 (Creative) ships month 2.
•	Each card: live mini-preview of template structure, template name, brief descriptor
•	Mobile: full-width stacked cards, large tap targets
•	Progress bar: 3/4 — 75%
5.5 Form — Step 4: Claim Your URL + Signup
•	Input: desired slug at liveportfolio.site/[slug] — real-time availability check via /api/check-slug
•	Preview shown live: clifford.liveportfolio.site
•	Blocked slugs: api, www, app, admin, blog, help, dashboard, status, support, login, signup, register, pricing, about, contact, terms, privacy, docs, faq, team, careers, demo, test, null, undefined
•	Auto-suggestions if slug taken: firstname-role, firstname-number
•	Signup: email+password OR Google OAuth (Supabase Auth)
•	Terms checkbox (required)
•	Progress bar: 4/4 — 100%
5.6 Generation Screen
•	Single AI call in progress (not 4 parallel chains)
•	Animated progress bar with labels: Parsing your information → Writing your story → Crafting project case studies → Finalising your portfolio
•	Target time: 4–6 seconds. SLA tiers defined in Section 11.
•	If generation fails: auto-retry once, then friendly error with 'Try again' button. Form data preserved.
•	Never show a blank spinner. Labels always visible throughout.
5.7 Preview Screen — THE SALES PAGE
This is the most important screen in the product. Every other screen exists to deliver the user here.
•	Full portfolio rendered using actual template component (not screenshot, not iframe)
•	Portfolio health score displayed prominently: 'Portfolio strength: 74/100' with progress bar (see Section 13)
•	Checklist of missing items below score (each item is a direct link to relevant form field)
•	Watermark: small 'Unlock to publish — $19' badge in corner
•	Header banner: 'Your portfolio is ready. Publish it to go live.' — no expiry language
•	Primary CTA: 'Publish — $19 (Professional)' and secondary: 'Publish — $9 (Launch)'
•	Template switcher: swap between Minimal and Bold instantly (same JSON, no AI call, no reload)
•	Inline editing: click any text element to edit inline — name, headline, bio, project descriptions
•	'Save my progress — I'll come back later' link — captures email, triggers email sequence
•	Mobile: primary CTA button fixed to bottom of screen, always visible above fold
v2.1 ADDITION: Health score and checklist added to preview screen in v2.1. See Section 13 for full spec.
5.8 Payment Flow
•	CTA click → Lemon Squeezy overlay (no redirect, stays on liveportfolio.site)
•	Two LS products: 'Launch — $9' and 'Professional — $19'
•	On payment: LS webhook → /api/webhook updates Supabase plan → Supabase Realtime pushes update to client — watermark removed, portfolio goes live without page reload
•	Background job triggered: Playwright screenshot at 1200×630px saved to Supabase Storage (see Section 12)
•	Confirmation: 'Your portfolio is live at clifford.liveportfolio.site — share it now'
•	Share buttons: LinkedIn (pre-written post with portfolio link), WhatsApp, copy link
•	Confirmation email sent via Resend with live URL
5.9 User Dashboard
•	Live portfolio link (clifford.liveportfolio.site) with one-click copy
•	Structured field editing: form inputs for all content (name, role, bio, project fields) — no AI, no canvas
•	Template switcher: instant re-render on change
•	Portfolio analytics: total view count, last viewed date
•	Portfolio health score with current checklist items
•	Custom domain CNAME connection (Professional plan only)
•	Account settings: email, password change, delete account


6. User Flow — Every Screen & State
Primary Happy Path — Pays on First Visit
Step	Screen	Key Moment
1	Landing page	Sees live example portfolios. Clicks 'Create My Portfolio'.
2	Form Step 1	Uploads CV — form pre-fills automatically. Adjusts name and role.
3	Form Step 2	Adds 3 projects with one-line descriptions.
4	Form Step 3	Selects Minimal template.
5	Form Step 4	Claims slug 'adaeze'. Signs up with Google.
6	Generation	Watches labelled progress steps for 5 seconds.
7	Preview	Sees full portfolio with AI bio and case studies. Health score: 78/100. Emotional reaction. Sees missing items.
8	Inline edit	Edits one project description to add a metric. Score jumps to 83/100.
9	Payment	Clicks 'Publish — $19'. Lemon Squeezy overlay. Pays.
10	Live	Portfolio at adaeze.liveportfolio.site. Copies link. Shares on LinkedIn immediately.
11	Day 3	Returns to dashboard, edits contact email. 12 views already.

Secondary Path — Defers Payment (enters email engine)
Event	Trigger	Action
Clicks 'Save & come back later'	Preview screen	Email captured. Redirect to: 'Your portfolio is saved. Check your email.' Sequence starts.
Email 1 (Day 0)	Immediate	Subject: 'Your portfolio is ready.' Screenshot of their portfolio. CTA: Publish it — $19.
Email 2 (Day 2)	Automated	Subject: 'What makes a portfolio get noticed'. Value tip. Soft CTA.
Email 3 (Day 7)	Automated	Subject: '[Name], your portfolio is still here'. Personal tone. Direct CTA.
Email 4 (Day 14)	Automated	Subject: 'A developer from Lagos just got hired'. Success story. CTA.
Email 5 (Day 21)	Automated	Subject: 'Quick question for you'. One-line email. Reply or publish.
Monthly email	Day 30+	Newsletter: tips, success stories, product news. Always includes personal CTA.

Edge Cases
•	CV upload fails — form stays manual, error shown, not blocking
•	AI generation fails — auto-retry once, fallback template text on second failure, preview still shown
•	Slug taken — real-time error, 3 auto-suggestions
•	Payment webhook delayed — client polls Supabase Realtime for up to 60 seconds before showing manual refresh prompt
•	User returns after not paying — link in email returns them to preview with payment CTA
•	Screenshot generation fails — email sequence uses placeholder gradient image, not blocking


7. Email Conversion Engine & Newsletter Asset
Philosophy
The email list is the most valuable long-term asset of the entire business. Every subscriber is a named, email-verified tech professional who completed a 4-step form and saw their generated portfolio. This is the highest-intent lead type possible. They are not cold contacts; they have already experienced the product. The email sequence converts them over time while simultaneously building brand authority.
v2.1 ADDITION: Long-term asset framing added in v2.1. The list has compounding value beyond this product.

Email Sequence (Resend, fully automated)
#	Day	Subject	Content & CTA
1	0	Your portfolio is ready	Screenshot of their portfolio. 'This is what recruiters will see.' CTA: Publish — $19.
2	2	What makes a portfolio get noticed	3 specific tips. Genuine value. Soft CTA at end.
3	7	[Name], your portfolio is still here	Personal tone. Portfolio is saved. View count if available. Direct CTA.
4	14	A developer from Lagos just got hired	Success story (real or composite). Before/after. CTA: Get yours live.
5	21	Quick question for you	One-line: 'What's stopping you from publishing?' Reply or publish link.
Monthly	30+	liveportfolio.site — monthly digest	Tips, success story, product update. Always personal CTA.

The Email List as Long-Term Platform Asset
A list of 10,000 African tech professionals is not just a conversion tool for liveportfolio.site. It is infrastructure for a much larger business. Future value unlocked by this list:
•	Sponsorship inventory: at 10,000 subscribers, each send has $500–2,000 sponsorship value
•	Job distribution: companies pay to reach active job-seekers in this audience
•	UpJobs.co acquisition engine: every subscriber is a pre-qualified UpJobs user
•	AI tools cross-sell: this audience actively buys productivity and career tools
•	Education products: bootcamp referrals, course promotions, certification guides
•	Recruiter marketplace: future paid tier for companies to search the portfolio database
Target: 10,000 subscribers by month 18. Treat every subscriber acquisition as compounding infrastructure, not just a conversion attempt.
Email Technical Setup
Provider	Resend (existing on UpJobs)
Automation	Resend Broadcasts + cron-scheduled sends on Hetzner VPS
Storage	email_subscribers table in Supabase
Screenshot in email	Pulled from portfolios.og_image_url (Supabase Storage)
Unsubscribe	One-click unsubscribe link in every email (legal requirement)
Free tier limit	3,000 emails/month. Upgrade to Resend paid ($20/mo) at 300+ active subscribers.


8. Technical Architecture
System Overview
Single Next.js 15 application on Hetzner VPS behind Nginx. Cloudflare in front for SSL, DDoS, and caching. Namecheap DNS with wildcard A record pointed to VPS IP, proxied through Cloudflare. Middleware separates two routing contexts: main app (liveportfolio.site) and portfolio renderer (*.liveportfolio.site).
Layer 1 — Namecheap DNS + Cloudflare
Domain	liveportfolio.site (Namecheap, active until May 2027)
DNS management	Change Namecheap nameservers to Cloudflare nameservers (one-time setup)
Wildcard A record	* → Hetzner VPS IP (Cloudflare proxied ON)
Root A record	@ → Hetzner VPS IP (Cloudflare proxied ON)
SSL mode	Full (strict) — Cloudflare → browser TLS, Cloudflare → VPS via Origin Cert
Origin certificate	Generated in Cloudflare dashboard, covers liveportfolio.site and *.liveportfolio.site, valid 15 years
Cache rule	Cache all *.liveportfolio.site portfolio pages for 1 hour (95% DB call reduction)
Cost	$0 — Cloudflare free tier
v2.1 ADDITION: Namecheap nameservers must be changed to Cloudflare NS for wildcard SSL to work. This is a one-time DNS migration taking 24–48 hours to propagate.

Layer 2 — Nginx (Reverse Proxy on Hetzner VPS)
•	server_name: *.liveportfolio.site liveportfolio.site
•	SSL: Cloudflare Origin Certificate at /etc/ssl/cf-origin.pem
•	proxy_pass: http://localhost:3001 (port 3001 avoids conflict with UpJobs on 3000)
•	proxy_set_header Host $host — CRITICAL for Next.js middleware to read subdomain
•	proxy_set_header X-Real-IP $remote_addr — for rate limiting
•	gzip on, client_max_body_size 5m, HTTP → HTTPS redirect
Layer 3 — Next.js 15 (App Router)
Middleware reads Host header on every request. Hostname = liveportfolio.site → route to main app (landing, form, auth, dashboard, API). Hostname ends with .liveportfolio.site → extract slug, rewrite to portfolio renderer, fetch from Supabase, render template component.
Layer 4 — Supabase
Postgres + Auth + Storage. Free tier: 500MB DB, 1GB storage, 50,000 MAU. Row Level Security on all tables. Profile photos and portfolio screenshots in public Storage bucket.
Layer 5 — OpenAI GPT-4o-mini
One call per user lifetime. Single structured prompt returns complete portfolio JSON via response_format: json_object. Cost: $0.08–0.15/generation. Never called again after initial generation.
Layer 6 — Playwright (Screenshot Service)
Runs on Hetzner VPS as a background process. Triggered after payment confirmation. Screenshots portfolio at 1200×630px, saves to Supabase Storage. Used for email OG images and LinkedIn/Twitter card previews. See Section 12 for full spec.
v2.1 ADDITION: Playwright screenshot pipeline added in v2.1. Critical for email sequence and social sharing.

Layer 7 — Lemon Squeezy + Resend
LS handles payments. Two products: Launch ($9) and Professional ($19). Webhook at /api/webhook verifies HMAC, updates Supabase plan, triggers screenshot generation, sends Resend confirmation email. Supabase Realtime pushes plan update to client without page reload.


9. Database Schema
Table: users
Column	Type	Constraint	Notes
id	uuid	PRIMARY KEY	Supabase auth.users reference
email	text	UNIQUE NOT NULL	Login email
slug	text	UNIQUE NOT NULL	Subdomain: slug.liveportfolio.site
plan	text	DEFAULT 'unpublished'	'unpublished' | 'launch' | 'professional'
published_at	timestamptz	NULLABLE	Set on payment confirmation
custom_domain	text	NULLABLE	Professional plan only
ls_customer_id	text	NULLABLE	Lemon Squeezy customer ID
created_at	timestamptz	DEFAULT now()	Auto

Table: portfolios
Column	Type	Notes
id	uuid	PRIMARY KEY
user_id	uuid	FK → users.id CASCADE DELETE
template	text	'minimal' | 'bold' | 'creative' (creative added month 2)
content	jsonb	Full portfolio data — see JSON structure below
health_score	integer	Calculated score 0–100, updated on each content change
seo_title	text	AI-generated for <title> tag
seo_description	text	AI-generated meta description, max 155 chars
og_image_url	text	Playwright screenshot URL in Supabase Storage
view_count	integer	DEFAULT 0 — batch-flushed from in-memory counter
edit_count	integer	DEFAULT 0 — informational only
last_viewed_at	timestamptz	Updated on portfolio visit
updated_at	timestamptz	DEFAULT now()
v2.1 ADDITION: og_image_url and health_score columns added in v2.1.

portfolios.content JSON Structure
Field	Type	Source
name	string	User input
role	string	User input — e.g. 'Data Scientist'
headline	string	AI-generated — max 120 chars
about	string	AI-generated — 2 paragraphs, human tone
location	string	User input
email	string	User input
github_url	string	User input, optional
linkedin_url	string	User input, optional
avatar_url	string	Supabase Storage public URL, optional
skills	string[]	User input, max 15 items
skills_narrative	string	AI-generated — one sentence skills summary
skills_grouped	object[]	AI-generated — { category: string, items: string[] }
projects	object[]	See project structure below
experience	object[]	{ company, role, period, bullets[] }

Project Object (within content.projects[ ])
Field	Type	Source
title	string	User input
problem	string	AI-generated — business/personal problem solved
solution	string	AI-generated — what was built and how
outcome	string	AI-generated — result, impact, or metric
stack	string[]	User input, split from comma-separated text
url	string	User input, optional

Table: payments
Column	Type	Notes
id	uuid	PRIMARY KEY
user_id	uuid	FK → users.id
ls_order_id	text	UNIQUE — idempotency check
product_tier	text	'launch' | 'professional'
amount_cents	integer	900 or 1900
created_at	timestamptz	DEFAULT now()

Table: email_subscribers
Column	Type	Notes
id	uuid	PRIMARY KEY
email	text	UNIQUE NOT NULL
user_id	uuid	NULLABLE — FK to users if account created
portfolio_og_url	text	Screenshot URL for email Day-0 image
source	text	'preview_defer' | 'waitlist' | 'incomplete_signup'
subscribed	boolean	DEFAULT true — false on unsubscribe
sequence_step	integer	DEFAULT 0 — tracks current email in sequence
created_at	timestamptz	DEFAULT now()


10. API Specification
POST /api/parse-cv
Purpose	Parse uploaded PDF CV to pre-fill form fields
Auth	None
Input	multipart/form-data — PDF max 5MB
Process	pdf-parse npm extracts text. Capped at 4,000 chars. GPT-4o-mini extracts structured fields in small extraction prompt.
Output	{ name, role, email, bio, skills[], projects[], experience[] }
Fallback	On any failure return empty object — form never blocked
Rate limit	3 per IP per hour
Cost	~$0.02 per call

POST /api/generate
Purpose	Generate full portfolio content from form data
Auth	Supabase session JWT (user created account in Step 4)
Input	{ name, role, bio, projects[], skills[], github_url, linkedin_url, target_role, template }
Input caps	bio: 500 chars | project descriptions: 200 chars each | skills: 15 max | projects: 4 max
Process	Single GPT-4o-mini call, response_format: json_object. Full content JSON returned.
Output	Full portfolios.content structure (see Section 9)
On success	Save to Supabase portfolios table. Return { portfolio_id, preview_ready: true }
Timeout	20 seconds. SLA tiers applied (see Section 11).
Rate limit	1 per user account (DB check) + 5 per IP per day
Cost	$0.08–0.15 per call

PATCH /api/update
Purpose	Update portfolio text content or template
Auth	Required — Supabase JWT. RLS enforces own-row only.
Input	{ content?: partial_object, template?: string }
Process	JSONB merge update. Recalculate and update health_score. No AI call.
Output	{ updated_at, health_score }

POST /api/webhook
Purpose	Receive Lemon Squeezy payment confirmation
Auth	HMAC-SHA256 via X-Signature header
Event	order_created
Idempotency	Check ls_order_id before processing
Process	Verify sig → find user → set plan + published_at → insert payment → trigger screenshot job → send Resend confirmation
Output	200 OK always (LS retries on non-200)

POST /api/subscribe
Purpose	Capture non-paying user email for sequence
Auth	None
Input	{ email, user_id?, source, portfolio_og_url? }
Process	Upsert email_subscribers. Trigger Day-0 Resend email.
Output	{ subscribed: true }

POST /api/screenshot
Purpose	Trigger Playwright screenshot of published portfolio
Auth	Internal service call only — not exposed publicly
Input	{ slug }
Process	Playwright loads slug.liveportfolio.site → screenshot 1200×630px → save to Supabase Storage → update portfolios.og_image_url
Trigger	Called by /api/webhook after payment confirmed
Timeout	30 seconds — async, does not block payment confirmation flow
v2.1 ADDITION: Screenshot API added in v2.1.

POST /api/analytics
Purpose	Record portfolio view without abusable DB writes
Auth	None
Process	In-memory IP+slug deduplication (1-hour TTL). Batch flush to Supabase every 5 minutes via setInterval.
Output	200 OK

GET /api/check-slug
Purpose	Real-time slug availability check
Input	?slug=clifford
Output	{ available: boolean, suggestion?: string }
Rate limit	10 per IP per minute


11. AI Generation Pipeline
Model Selection
GPT-4o-mini. Not GPT-4o. Quality for portfolio text generation is equivalent at 20x lower cost. At $0.10–0.15/generation and $19/sale, AI cost is 0.8% of revenue.
Single Structured Call Architecture
One prompt. One API call. response_format: { type: 'json_object' } enforces valid JSON output. No parsing failures. No markdown code blocks to strip. One failure surface.
System prompt	You are a professional career copywriter specialising in tech portfolios for African and global tech talent. You transform raw professional information into polished, recruiter-ready content. Respond with valid JSON only. No preamble, no markdown, no commentary.
User prompt	Given this professional data: [structured input], generate a complete portfolio content object with: headline (compelling one-liner), about (2 confident paragraphs), skills_narrative (one sentence), skills_grouped (by category), projects (each with problem/solution/outcome transformed from brief description), seo_title, seo_description. Return JSON only.
Temperature	0.7
Max tokens	1,200
Response format	response_format: { type: 'json_object' }
AI Banned Vocabulary List
RISK MITIGATION: If generated copy sounds 'ChatGPT-ish', trust collapses immediately — especially with developers. These words must be in the system prompt as banned vocabulary.

The following words and phrases are hardcoded into the system prompt as banned:
•	Adjective soup: passionate, results-driven, highly motivated, dynamic, innovative, proactive, detail-oriented, self-starter, team player, thought leader, go-getter
•	Corporate buzzwords: leveraging, synergy, spearheaded, impactful, fast-paced, cutting-edge, disruptive, robust, seamless, scalable solutions, best-in-class
•	Vague filler: various responsibilities, worked on, assisted with, contributed to, helped with
Required tone in system prompt: 'Write like a sharp recruiter rewrote their profile — competent, calm, specific, human. Use concrete specifics and active verbs. Avoid adjectives that mean nothing. Sound like a real person, not an AI assistant.'
v2.1 ADDITION: Banned vocabulary list added in v2.1. Must be in system prompt before first production generation.

Generation Speed SLA
v2.1 ADDITION: SLA tiers added in v2.1. Speed beats verbosity. If generation is slow, reduce output size first.

Generation Time	Status	Response
Under 5 seconds	Ideal	Full output. All fields populated.
5–8 seconds	Acceptable	Full output. Animated step labels maintain perceived momentum. No user-visible degradation.
8–12 seconds	Degraded	Reduce max_tokens by 30%. Shorten bio to 1 paragraph. Shorten project outcomes. Still show full preview.
Over 12 seconds	Timeout	Return fallback JSON: raw user data as placeholder text in all fields. Show preview with message: 'We have a starter version ready — you can polish it in the dashboard.' Never block the user from seeing a result.
API failure	Error	Auto-retry once with 2-second backoff. If second attempt fails, use fallback JSON. Log error for monitoring. Never show blank screen.
Input Sanitisation Before Call
•	All text: strip HTML tags at API layer
•	Bio: cap at 500 chars
•	Project descriptions: cap at 200 chars each
•	Skills: cap at 15 items
•	Projects: cap at 4
•	Total estimated input tokens: checked before call — reject if over 2,500
Abuse Protection
•	1 generation per user account — enforced by DB check before API call
•	5 per IP per day — catches multi-account abuse
•	No regeneration endpoint in v1
Fallback Template Values
If any AI field is missing: headline defaults to '[Role] based in [Location]', about defaults to 'Professional with experience in [skills]. Currently building [first project title].', project fields default to user's original description. Portfolio always renders, never blank.


12. Screenshot Generation Pipeline
v2.1 ADDITION: Entire section added in v2.1. Critical for email sequence and social sharing.

Why This Is Non-Negotiable
The Day-0 email shows a screenshot of the user's portfolio. Without this, the email is text-only and loses its primary conversion mechanism. The LinkedIn OG card shows this image when users share their portfolio link. Without it, LinkedIn shows a blank preview and sharing psychology is broken. This must be part of the generation pipeline, not a later addition.
Technical Implementation
Library	Playwright (Node.js) — already available in Node ecosystem, headless Chromium
Trigger	Called async after /api/webhook confirms payment. Does not block payment flow.
Process	1. Playwright launches headless Chromium. 2. Navigates to slug.liveportfolio.site (portfolio now live). 3. Waits for page load and font render (waitForLoadState: networkidle). 4. Screenshots full page at 1200×630px (standard OG image size). 5. Uploads to Supabase Storage bucket: og-images/slug.jpg. 6. Updates portfolios.og_image_url with public URL.
Dimensions	1200×630px — standard Open Graph card size for LinkedIn and Twitter
Storage	Supabase Storage, public bucket, JPEG 85% quality (~80–120KB per image)
Timeout	30 seconds maximum. If fails, og_image_url remains null. Email uses gradient placeholder.
Retry	If screenshot fails, retry once after 60 seconds. Log failures for monitoring.
VPS cost	Playwright requires ~200MB RAM per instance. Run as separate PM2 process. At current VPS spec (4GB RAM), handles concurrent screenshots fine.
Where the Screenshot URL Is Used
•	Email sequence Day-0 and Day-3: portfolio_og_url in email_subscribers table
•	LinkedIn OG meta tag on slug.liveportfolio.site: <meta property='og:image' content={og_image_url}>
•	Twitter card meta tag on portfolio page
•	Future: thumbnail grid on liveportfolio.site/discover (talent directory, month 6+)
Meta Tags on Portfolio Pages
og:title	portfolios.seo_title (AI-generated)
og:description	portfolios.seo_description (AI-generated)
og:image	portfolios.og_image_url (Playwright screenshot)
og:url	https://slug.liveportfolio.site
twitter:card	summary_large_image
twitter:image	portfolios.og_image_url


13. Portfolio Health Score
v2.1 ADDITION: Entire section added in v2.1.

Purpose
Shown on the preview screen immediately after generation. Creates completion psychology: the user sees '74/100' and wants to reach 100 before publishing. This drives inline editing, which improves portfolio quality, which improves conversion and sharing outcomes. Each checklist item is a direct link to the relevant form field.
Scoring Criteria (deterministic, no AI, calculated client-side)
Criteria	Points	How to earn
Profile photo uploaded	10	Avatar URL present in content JSON
GitHub URL added	10	github_url not empty
LinkedIn URL added	10	linkedin_url not empty
3 or more projects	20	projects[].length >= 3
Each project has an outcome with a number/metric	5 each, max 15	outcome field contains a digit (regex: /\d/)
Bio is over 100 words	10	about.split(' ').length > 100
5 or more skills listed	10	skills[].length >= 5
Experience section present	15	experience[].length > 0
TOTAL POSSIBLE	100	
Display on Preview Screen
•	Score bar: 'Portfolio strength: 74/100' with green progress bar
•	Below bar: checklist of missing items only (items already earned are hidden)
•	Each missing item is a clickable link that scrolls to and highlights the relevant form field
•	Score updates in real-time as user edits inline on preview screen
•	Score persists to portfolios.health_score column on save and on each update
Health Score in Dashboard
•	Shown prominently on dashboard home: current score + what to do next
•	'Improve my score' button links to edit form
•	Score increase after edit shown as animation: '74 → 84' with green flash


14. Template Quality Standards
v2.1 ADDITION: Entire section added in v2.1. Template quality is existential — it is the product.

The Standard
The Framer Screenshot Test
Take a screenshot of the generated portfolio. Show it to a developer without context. They must say: 'That looks like a Framer, Vercel, or Linear showcase portfolio — who built that?' If they say 'looks like a template', the template fails. Do not ship until this test passes.

Typography Requirements
•	Font: Inter (primary) or Geist — load via next/font, no FOUT, no fallback flash
•	Body text: minimum 16px (mobile), 17px (desktop), line-height 1.6+
•	Headings: consistent type scale (e.g. 48/36/24/18 or similar modular scale)
•	Font weight range: use at minimum regular (400) and semibold (600) for visual hierarchy
•	Never use system-ui alone. Never use Arial or Times in the portfolio templates.
Spacing Requirements
•	Section padding: minimum 80px vertical (desktop), 48px (mobile)
•	Card padding: minimum 24px on all sides
•	Element spacing: minimum 16px between related items, 32px between sections
•	Line length: body text maximum 65 characters per line (achieved via max-width on text containers)
Mobile Requirements
•	Test on iPhone SE (375px width) as minimum viewport — must look better than 90% of developer portfolios
•	All tap targets minimum 44×44px
•	No horizontal scroll at any viewport width
•	Hero section must be fully readable without scrolling on 375px viewport
•	Navigation collapses to hamburger or stacked links on mobile
Visual Quality Requirements
•	No stock photo backgrounds or clip art
•	Colour palette: maximum 3 colours per template (background, text, accent)
•	Project cards must have visible structure: title, stack badges, outcome, link
•	Skills displayed as visual tags/chips, not plain comma-separated text
•	Transition/hover states on all interactive elements (buttons, links, cards)
•	Consistent border radius throughout each template (either all sharp or all rounded — no mixing)
Performance Requirements
•	Lighthouse performance score: 90+ on mobile
•	No layout shift (CLS < 0.1)
•	First contentful paint under 1.2 seconds when served from Cloudflare cache
•	No external JavaScript dependencies in templates (everything bundled by Next.js)
Quality Policy
•	Ship 2 elite templates before 3 mediocre ones
•	Template 1 (Minimal) must be approved before Template 2 (Bold) is started
•	Approval criteria: Framer screenshot test + mobile test on iPhone SE + Lighthouse 90+
•	Each template must be built desktop-first, then mobile-optimised — not the reverse


15. Pricing & Monetisation Model
Tier Structure
Feature	Unpublished (preview)	Launch — $9	Professional — $19
Portfolio status	Preview only, not live	Live permanently	Live permanently
URL	Preview in browser	slug.liveportfolio.site	slug.liveportfolio.site
Watermark	Yes	Removed	Removed
Templates	Preview all 2	Both templates	Both + future
Health score	Shown with checklist	Shown in dashboard	Shown in dashboard
AI generation	1x to preview	Included	Included
Text editing	Yes (inline on preview)	Yes (dashboard)	Yes (dashboard)
Custom domain	No	No	Yes
View analytics	No	Total count	Total count + history
OG image / social card	No	Yes (auto-generated)	Yes (auto-generated)
Priority support	No	Email	Priority email

Revenue Math to $300/Month
Scenario	Sales needed	Revenue
All Professional ($19)	16 sales/mo	$304/mo
All Launch ($9)	34 sales/mo	$306/mo
Mix: 70% Pro, 30% Launch	16 Pro + 7 Launch	$367/mo
Month 3 realistic	8 Pro + 5 Launch = 13 total	$197/mo
Month 6 realistic	18 Pro + 5 Launch = 23 total	$387/mo
Break-even (cover fixed costs)	1 Professional sale/mo	$19 covers $7.25 fixed


16. Infrastructure & DevOps
Server
Provider	Hetzner VPS (existing — UpJobs already running here)
Spec	CX21: 2 vCPU, 4GB RAM. Sufficient for MVP. Upgrade to CX31 at >200 concurrent users.
OS	Ubuntu 24.04 LTS
Process manager	PM2 — new entry: portfoliokit on port 3001. Playwright screenshotter as separate process.
Existing apps	UpJobs on port 3000 — no port conflict
DNS Migration Steps (one-time)
•	Step 1: Create free Cloudflare account. Add liveportfolio.site as a site.
•	Step 2: Cloudflare scans and imports existing DNS records.
•	Step 3: In Namecheap → Domain → Nameservers: change to Cloudflare nameservers provided.
•	Step 4: Wait 24–48 hours for propagation.
•	Step 5: In Cloudflare → DNS: add wildcard A record (* → VPS IP, proxied) and root A record (@ → VPS IP, proxied).
•	Step 6: SSL/TLS → Origin Server → Create Certificate → covers liveportfolio.site and *.liveportfolio.site → validity 15 years.
•	Step 7: Download certificate, install to VPS at /etc/ssl/cf-origin.pem and /etc/ssl/cf-origin.key.
•	Step 8: Set Cloudflare SSL mode to Full (strict).
•	Done. SSL and wildcard subdomains are live forever with zero maintenance.
Environment Variables
NEXT_PUBLIC_ROOT_DOMAIN	liveportfolio.site
NEXT_PUBLIC_APP_URL	https://liveportfolio.site
NEXT_PUBLIC_SUPABASE_URL	Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY	Supabase anon key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY	Server-side only — never in client bundle
OPENAI_API_KEY	OpenAI API key
LEMON_SQUEEZY_WEBHOOK_SECRET	HMAC verification secret
LEMON_SQUEEZY_API_KEY	For order lookup
RESEND_API_KEY	Email delivery
PLAYWRIGHT_BASE_URL	https://liveportfolio.site (for screenshot generation)
Deployment
•	git push main → SSH to VPS → git pull && npm run build && pm2 reload portfoliokit
•	PM2 cluster mode, 2 instances for zero-downtime reloads
•	Target deploy: under 4 minutes


17. Security & Abuse Prevention
Authentication
•	Supabase Auth — email/password + Google OAuth
•	JWT tokens, 1-hour expiry, auto-refreshed by Supabase client
•	Row Level Security on all tables — users only SELECT/UPDATE own rows
•	Service role key server-side only, never in client bundle
Rate Limits
Endpoint	Limit	Enforcement
/api/generate	1 per user account lifetime	DB check before processing
/api/generate	5 per IP per day	In-memory counter
/api/parse-cv	3 per IP per hour	In-memory counter
/api/check-slug	10 per IP per minute	In-memory counter
/api/analytics	1 per IP per portfolio per hour	In-memory Set
All endpoints	100 req/min per IP	Nginx limit_req_zone
Input Sanitisation
•	All text: strip HTML at API layer regardless of frontend validation
•	Slug: /^[a-z0-9-]{3,30}$/ enforced, lowercase only
•	CV upload: MIME check (application/pdf only), 5MB max
•	Profile photo: MIME check (JPEG/PNG), resize to 400×400 via sharp, save as JPEG 80%
•	Portfolio content rendered via React — XSS safe by default (no dangerouslySetInnerHTML)
Reserved Slugs
Blocked: api, www, app, admin, blog, help, dashboard, status, support, login, signup, register, pricing, about, contact, terms, privacy, docs, faq, team, careers, demo, test, null, undefined, liveportfolio


18. Marketing & Distribution
The Core Distribution Loop
Every published portfolio at slug.liveportfolio.site has a 'Built with liveportfolio.site' link in the footer. Every job application submitted, every LinkedIn post, every WhatsApp message containing that link is a product impression. This loop compounds automatically with every new paying user.
Channel Priority
Channel	Tactic	ROI
Footer viral loop	Built with liveportfolio.site on all published portfolios	Highest — permanent, compounds
WhatsApp groups	Post demo in Ingressive4Good, GoMyCode alumni, Andela alumni, Nigerian tech groups	Very high — trusted peer network
Twitter/X	Reply to every 'how do I build a portfolio', 'I need a portfolio' tweet with live demo	High — fast feedback loop
LinkedIn	Before/after posts. Success stories. Tag Wema Bank colleagues, bootcamp contacts.	High — professional credibility
Bootcamp partnerships	GoMyCode (contact: Temitope Bamidele), ALX Africa, Ingressive4Good — co-branded pages	Very high — batch users per cohort
SEO blog	Keywords: 'portfolio website Nigeria', 'tech portfolio Africa', 'how to get remote job Nigeria'	Medium — 3–6 month lag, permanent
Product Hunt	Tuesday launch, IH cross-post, pre-load hunter votes from community	Medium — global spike
Pre-Launch Content Checklist (Week 1)
•	Create 3 example portfolios at real liveportfolio.site subdomains for live demos on landing page
•	Record 90-second Loom: form fill → generation → live link at liveportfolio.site
•	Write 3 seed blog posts targeting SEO keywords
•	LinkedIn and Twitter post 3 days before launch: 'Building something for African tech professionals — want early access?'
•	DM 15 people in network who are job-hunting — ask them to be first beta users


19. Economics & Cost Model
Monthly Fixed Costs
Hetzner CX21 VPS	$5.99/month (shared with UpJobs — no new server needed)
Supabase free tier	$0 — 500MB DB, 1GB storage, 50,000 MAU
Cloudflare free tier	$0 — DNS, SSL, DDoS, CDN
Resend free tier	$0 — 3,000 emails/month
liveportfolio.site domain	~$1.25/month ($15/year, active until May 2027)
OpenAI (variable)	$0.10–0.15 per paying user (single generation, never repeated)
Lemon Squeezy fee	5% + $0.50 per transaction (~$1.45 on $19 sale)
TOTAL FIXED	~$7.25/month until 50 paying users
Unit Economics per $19 Sale
OpenAI generation	$0.12
Playwright screenshot	$0.001 (VPS compute, negligible)
Lemon Squeezy fee	$1.45
Resend (5–6 emails)	$0.001
Supabase storage	$0.002 (photo + OG image)
Hosting (per user share)	$0.006
TOTAL variable cost	~$1.58
NET per $19 sale	~$17.42 (91.7% gross margin)
Scaling Economics
•	10,000 portfolios: content JSON ~5KB each = 50MB DB. Still on Supabase free tier.
•	Cloudflare caches portfolio pages 1 hour: 10,000 daily views = ~170 DB reads/hour, not 10,000.
•	OG images: ~100KB each x 10,000 users = 1GB storage. Just at Supabase free tier limit — move to paid ($25/mo) at ~8,000 users.
•	Playwright: handles 1 screenshot per sale, async. No scaling issue at current volumes.
•	When to upgrade: Supabase paid at ~500 MAU. Resend paid ($20/mo) at ~300 active email subscribers.


20. Launch Plan — 14-Day Build Sprint
Days	Focus	Deliverables
1–2	2 Portfolio Templates	Minimal.tsx and Bold.tsx. Must pass Framer screenshot test and iPhone SE mobile test before moving on. Font: Inter. All content consumed from portfolios.content JSON.
3–4	4-Step Form	Multi-step form with validation, character counters, CV upload → /api/parse-cv, template preview cards, slug availability check, Supabase Auth (email + Google).
5–6	AI Generation Pipeline	Single GPT-4o-mini call, response_format: json_object, master prompt with banned vocabulary list, error handling, fallback values, SLA tier logic. Test with 10 diverse profiles.
7	Save + Preview + Health Score	Portfolio save to Supabase. Preview screen with actual template rendering. Inline editing. Health score calculation and checklist display. Template switcher.
8	Subdomain Routing	middleware.ts. Nginx wildcard config. Cloudflare DNS migration (wildcard A record). Cloudflare Origin Certificate installed. End-to-end test: form → generate → preview → save → live at slug.liveportfolio.site.
9	Payment + Webhook	Lemon Squeezy products (Launch $9, Professional $19). /api/webhook with HMAC. Supabase Realtime client update. Post-payment confirmation and share buttons.
10	Screenshot Pipeline	Playwright installed on VPS. /api/screenshot route. Background job triggered by webhook. OG meta tags on portfolio pages. Test on 5 portfolios.
11	Email Engine	/api/subscribe. email_subscribers table. Resend 5-email sequence drafted, scheduled, and tested end-to-end. Day-0 email with portfolio screenshot verified.
12	Dashboard	Live link display, structured field editing, template switcher, view count, health score, custom domain CNAME form.
13	Landing Page	Full landing page live at liveportfolio.site with 3 example portfolio links. Pricing table. FAQ. Mobile QA. Lighthouse 90+ check.
14	First 10 Users	DM 15 people in network. Get real feedback. Target: 1 paying customer by end of day 14. Document every friction point.
If Behind Schedule
•	Must ship: 2 templates (Minimal only if needed), form, AI generation, auth, save, subdomain routing, payment
•	Ship week 3: health score, screenshot pipeline, email sequence, dashboard editing
•	Ship month 2: template 3 (Creative), custom domain, analytics history


21. Post-Launch Roadmap
Month 2 — Polish & Retention
•	Template 3 (Creative) built and shipped after gathering beta user feedback on preference
•	Full Resend 5-email sequence live and converting
•	Custom domain CNAME connection flow for Professional plan
•	Portfolio page SEO: auto sitemap.xml, robots.txt
•	'Share my portfolio' pre-written LinkedIn post generator on dashboard
•	Open Graph card preview on dashboard: 'This is what your link looks like on LinkedIn'
Month 3 — Growth
•	Bootcamp partnership programme: co-branded landing pages for GoMyCode (Temitope Bamidele), ALX Africa, Ingressive4Good
•	Affiliate programme: unique referral links, $3 commission per referred paying user
•	GitHub OAuth import: auto-populate projects from pinned repos
•	Blog: 6+ SEO articles live, targeting African tech job search keywords
•	Email list target: 300+ subscribers
Month 4–6 — Monetisation Expansion
•	Annual plan: $29/year (introduces recurring revenue alongside one-time)
•	Team plan: 5 portfolios for $49 (bootcamp instructors, HR teams)
•	Premium templates: 2 additional paid templates at $5 upgrade
•	UpJobs.co integration: liveportfolio.site users see curated job recommendations
•	Email list monetisation begins: first sponsored send, job board distribution
Month 6+ — Phase 3: Talent Discovery Layer
v2.1 ADDITION: Added in v2.1 based on review strategic insight.

When 1,000+ published portfolios exist at liveportfolio.site, enable opt-in public talent directory:
•	Publicly indexed pages: 'Data Scientists in Lagos' / 'Frontend Developers in Ghana' / 'UI Designers in Nairobi'
•	Each directory page is SEO-optimised with structured data markup
•	Individual portfolio pages already indexed via their subdomain URLs
•	Opt-in toggle: 'List me in the talent directory' (default: on for Professional plan)
•	Recruiter landing page: 'Find African tech talent. Browse 1,000+ verified portfolios.'
•	Monetisation path: recruiter subscriptions for contact access, placement referral fees
•	This creates a two-sided marketplace on top of the existing portfolio infrastructure with no additional user-facing features required
Target milestone: 1,000 published portfolios before enabling directory. Do not rush this.


22. Constraints & Non-Goals for v1
Explicitly Out of Scope
•	Drag-and-drop canvas editor — creates support burden, kills simplicity
•	Resume PDF generation — separate product, dilutes focus
•	LinkedIn OAuth import — LinkedIn blocks scraping; URL field sufficient
•	ATS scoring or resume optimisation — different product
•	Video portfolio sections — bandwidth cost
•	Subscription pricing — explicitly excluded for this product
•	Mobile app — responsive web sufficient
•	Multi-language support — English only in v1
•	Social features, marketplace, community — this is a tool
•	AI chat assistant or continuous AI guidance — not needed with guided form
Hard Technical Constraints
•	14-day build to first paying customer — hard deadline, cut features not quality
•	Infrastructure cost under $10/month until 50 paying users
•	AI cost per user: under $0.20 forever (enforced by 1-generation rule)
•	Portfolio page load: under 2 seconds on mobile (Cloudflare cache achieves this)
•	Generation time: under 8 seconds worst case, target 5 seconds
•	Template quality: Framer screenshot test must pass before shipping


23. Success Metrics
Day 14 — Launch
•	10 real portfolios generated (non-test accounts)
•	1 paying customer
•	Zero critical bugs in core flow: form → generate → preview → pay → live
•	Generation succeeds for 9 out of 10 test profiles
•	Portfolio loads in under 2 seconds on mobile
•	Day-0 email delivers with portfolio screenshot visible
Month 1
•	50+ portfolios generated
•	4+ paying customers ($76+ revenue)
•	30+ email subscribers
•	Average health score of paying users: 75+
•	Average portfolio view count: 5+ (means users are sharing links)
Month 3
•	200+ portfolios generated
•	16+ paying customers per month ($180+ revenue)
•	200+ email subscribers
•	5%+ email-to-paid conversion rate
•	One bootcamp partnership signed
•	SEO blog: 100+ monthly organic visits
•	25%+ of new signups attributable to 'Built with liveportfolio.site' footer clicks
Month 6
•	$300+ monthly revenue
•	500+ portfolios in DB (free preview + paid)
•	800+ email subscribers
•	Email list generating 5+ sales/month independently
•	One documented user case study: hired via their liveportfolio.site portfolio
Month 18
•	$1,200+ monthly revenue
•	10,000+ email subscribers
•	1,000+ published paid portfolios
•	Talent discovery directory live and indexed by Google
•	Email list generating independent revenue (sponsorships or job board)

liveportfolio.site — PRD v2.1 — All decisions locked. Start building.
Ecotronics Enterprise  —  Clifford Nwanna  —  May 2026
