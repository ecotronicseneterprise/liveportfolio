LIVEPORTFOLIO.SITE
Complete VPS Deployment Guide
Every command is copy-paste ready. Nothing to figure out.
Ecotronics Enterprise — Clifford Nwanna — May 2026
Your Server Details (baked into every command below)
VPS IP: 46.225.186.103
SSH command: 
ssh -i $HOME\.ssh\liveportfolio deploy@46.225.186.103

ssh deploy@46.225.186.103
Domain: liveportfolio.site (Namecheap)
App port: 3001 (UpJobs runs on 3000 — no conflict)
Web server: Caddy (already installed — do NOT install or start Nginx)


Part 1 — How Everything Fits Together
Before touching any command, read this once. It explains every layer so nothing is confusing.
The 4 Layers (simple mental model)
Layer	What it does
Namecheap DNS	Points liveportfolio.site and *.liveportfolio.site to your VPS IP 46.225.186.103. This is just telling the internet 'that domain lives at that address'. One-time setup.
Caddy on VPS	Sits on port 80/443, receives all web traffic, forwards it to your Next.js app on port 3001. It reads the Host header (e.g. clifford.liveportfolio.site) and passes it along. Also handles SSL automatically — no Certbot needed.
Next.js app on port 3001	Your actual application. Middleware reads the Host header: if it's liveportfolio.site → show the main app. If it's anything.liveportfolio.site → show that user's portfolio.
Supabase + OpenAI + LS	External services. Your app talks to them via API keys in .env.local.

The Traffic Flow
Browser types: clifford.liveportfolio.site
       ↓
Namecheap DNS says: 46.225.186.103 (your VPS)
       ↓
Caddy on port 443 receives the request (SSL terminated here)
Caddy passes Host: clifford.liveportfolio.site to Next.js
       ↓
Next.js middleware reads host header
Sees it ends with .liveportfolio.site
Extracts slug: 'clifford'
Fetches portfolio from Supabase where slug = 'clifford'
Renders portfolio template
       ↓
User sees Clifford's portfolio

NOTE: Nginx is installed on this VPS but must stay stopped. Caddy already owns
port 80/443 and handles everything. If Nginx starts it will conflict and break the site.
To keep Nginx permanently disabled:
sudo systemctl stop nginx
sudo systemctl disable nginx


Part 2 — Namecheap DNS Setup (5 minutes, do this first)
Do this BEFORE touching the VPS. DNS takes up to 30 minutes to propagate. Start it now so it's ready when your app is live.

Steps in Namecheap
Step 1
Log into Namecheap → Domain List → click Manage next to liveportfolio.site
Step 2
Click 'Advanced DNS' tab at the top
Step 3
Delete ALL existing records. Then add exactly these 2 records:

Type	Host	Value	TTL
A Record	@	46.225.186.103	Automatic
A Record	*	46.225.186.103	Automatic

The @ record handles liveportfolio.site. The * (wildcard) handles ANY subdomain: clifford.liveportfolio.site, john.liveportfolio.site, etc.

Click the green tick to save each record. Done.
How to verify DNS is working (check in 30 minutes):
# Run this on your local machine (not the VPS)
# Replace with any test subdomain
nslookup test.liveportfolio.site

# Expected output should include:
# Address: 46.225.186.103

# Or use this website: https://dnschecker.org
# Search for: *.liveportfolio.site


Part 3 — VPS Setup (one-time, 10 minutes)
Connect to your VPS
ssh deploy@46.225.186.103
# Type your password when prompted
# You are now inside the VPS

Check if you have sudo access
sudo whoami
# Should output: root
# If it asks for a password, type your deploy password

# If you get 'deploy is not in the sudoers file':
# You need to switch to root user first:
su -
# Then add deploy user to sudoers:
usermod -aG sudo deploy
exit
# Then reconnect: ssh deploy@46.225.186.103

Install everything needed (copy the whole block at once)
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install git
sudo apt install -y git

# Install PM2 globally
sudo npm install -g pm2

# Verify everything installed correctly
node --version    # should show v20.x.x
npm --version     # should show 10.x.x
pm2 --version     # should show 6.x.x

NOTE: Do NOT install or start Nginx. Caddy is already running and owns port 80/443.

Verify Caddy is running
sudo systemctl status caddy
# Look for: Active: active (running)

# Test that port 80 is open (should redirect to HTTPS)
curl -I http://46.225.186.103
# Expected: HTTP/1.1 308 Permanent Redirect


Part 4 — Caddy Configuration (add liveportfolio.site block)
Caddy is already running with configs for upjobs.co and the gateman dashboard.
You only need to ADD the liveportfolio.site block — do not touch anything else.

Open the Caddyfile
sudo nano /etc/caddy/Caddyfile

Scroll to the very bottom and paste EXACTLY this block:

liveportfolio.site, www.liveportfolio.site {
    reverse_proxy localhost:3001 {
        transport http {
            read_timeout 90s
            write_timeout 90s
            dial_timeout 10s
        }

        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    request_body {
        max_size 5MB
    }

    encode gzip zstd

    header {
        -Server
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    log {
        output file /var/log/caddy/liveportfolio-access.log
        format json
    }
}

Save the file: press Ctrl+X, then Y, then Enter

Validate and reload Caddy
# Validate config first (must say 'Valid configuration')
sudo caddy validate --config /etc/caddy/Caddyfile

# If valid, reload without downtime
sudo systemctl reload caddy

# Verify Caddy is still running cleanly
sudo systemctl status caddy
# Look for: Active: active (running)

IMPORTANT — Wildcard subdomain SSL note:
The block above enables liveportfolio.site with automatic HTTPS. For wildcard
subdomains (clifford.liveportfolio.site, john.liveportfolio.site etc.) Caddy
needs a Namecheap DNS API plugin to issue the wildcard SSL certificate. Without
it, subdomains will work over HTTP but not HTTPS until the plugin is installed.

This is why you may see this browser error on subdomains:
ERR_SSL_PROTOCOL_ERROR (HTTPS handshake fails)

Workarounds until wildcard HTTPS is installed:
- Use http://slug.liveportfolio.site (HTTP) for published portfolios, OR
- Use https://liveportfolio.site/portfolio/slug (HTTPS on the main domain) for demos/testing

For v1 launch, the main domain has full HTTPS. Wildcard subdomain HTTPS
is a one-time follow-up step — add it after the app is confirmed working.

To add wildcard HTTPS later, install the caddy-dns/namecheap module and update
the Caddyfile block to use a tls directive with the Namecheap DNS provider.


Part 5 — Deploy the App
Create the app directory
mkdir -p /home/deploy/apps

./deploy.sh
Clone your GitHub repo
# Replace YOUR_GITHUB_USERNAME with your actual username
git clone https://github.com/YOUR_GITHUB_USERNAME/liveportfolio.git
cd liveportfolio

# Verify you're in the right folder
ls
# Should show: package.json, app/, components/, etc.

Use GitHub Actions for remote build and deploy
This repo now includes a CI/CD workflow at `.github/workflows/ci-deploy.yml`.
When the workflow succeeds, it already:
- builds the app off-server
- copies `.next`, `public`, `package.json`, `package-lock.json`, `next.config.ts`, `ecosystem.config.js`, and `deploy.sh` to the VPS
- installs production dependencies on the VPS
- reloads PM2

If the GitHub Actions job succeeded, no further deployment action is required on the VPS except verification.

Note: the workflow copies to a staging folder (`/home/deploy/apps/liveportfolio__incoming`) and then swaps it into place to avoid downtime if a copy/install step fails. The VPS does not have full source code in this mode, so do not run `npm run build` on the server unless you deployed the full repo.

To use it, create these repository secrets in GitHub:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_SSH_PORT`

CI/CD Reliability: the exact flow (Local → GitHub Actions → VPS)
This is the "source of truth" deployment path. Use this, and you avoid VPS build failures.

1) Local machine (you)
- You code locally and push to `main`.
- You do NOT build on the VPS in this mode.

2) GitHub Actions (CI)
- GitHub Actions runs `npm install` and `npm run build` on GitHub's runner.
- It uploads build artifacts to the VPS staging folder:
  `/home/deploy/apps/liveportfolio__incoming`
- Transfer uses `rsync` (not tar/scp) for reliability. It also excludes `.next/cache` to reduce upload size.

3) VPS (CD)
- The workflow swaps the staging folder into place (atomic-ish release):
  - current release becomes `/home/deploy/apps/liveportfolio__previous`
  - incoming becomes `/home/deploy/apps/liveportfolio`
- Then the VPS installs production deps and restarts via PM2 using `ecosystem.config.js`.

Important: there are 2 different folders on the VPS
- `~/liveportfolio` = a full git checkout (source code). Useful for browsing, but NOT used by CI/CD runtime.
- `/home/deploy/apps/liveportfolio` = the artifact runtime folder (contains `.next`, not necessarily `app/`/`pages/`).

If you mix these up, you get the exact outage we saw:
- PM2 starts in `~/liveportfolio` → no `.next` there → Next crashes → Caddy shows `502`.

Golden rule: PM2 must run from `/home/deploy/apps/liveportfolio`
Check:
pm2 describe liveportfolio | grep "exec cwd"
# Must show: /home/deploy/apps/liveportfolio

Fast 502 recovery playbook (copy/paste on VPS)
# 1) Prove the app is (not) listening
ss -lntp | grep 3001 || true

# 2) Read logs
pm2 logs liveportfolio --lines 120
sudo journalctl -u caddy --since "10 min ago" --no-pager | tail -80

# 3) If PM2 is running from the wrong folder, reset it correctly
pm2 delete liveportfolio || true
cd /home/deploy/apps/liveportfolio
npm ci --omit=dev
pm2 start ecosystem.config.js --update-env
pm2 save

# 4) Local health check on VPS
curl -I http://127.0.0.1:3001

Note on testing HTTPS from the VPS
If `curl -I https://liveportfolio.site` prints "Killed", test HTTPS from your laptop/browser instead.
On the VPS, use `curl -I http://liveportfolio.site` (expect 308 redirect) and `curl -I http://127.0.0.1:3001` (expect 200).

If you cannot use GitHub Actions yet, the manual deployment steps below still work as a fallback, but the CI/CD workflow is the recommended approach for a 4GB VPS.

Verify deployment on the VPS
ssh deploy@46.225.186.103

# Confirm the app is running under PM2
pm2 status

# View the latest app logs
pm2 logs liveportfolio --lines 50

# Confirm Caddy is running
sudo systemctl status caddy

# Confirm external access
curl -I https://liveportfolio.site

Create your environment file
nano .env.local

Paste exactly this, then fill in your actual values:
# liveportfolio.site environment variables

NEXT_PUBLIC_ROOT_DOMAIN=liveportfolio.site
NEXT_PUBLIC_APP_URL=https://liveportfolio.site

# Supabase (get from supabase.com -> your project -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI (get from platform.openai.com -> API keys)
OPENAI_API_KEY=sk-your_key_here

# Lemon Squeezy (get from app.lemonsqueezy.com -> Settings -> API)
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMON_SQUEEZY_API_KEY=your_api_key_here

# Resend (get from resend.com -> API keys)
RESEND_API_KEY=re_your_key_here

Save: Ctrl+X, Y, Enter

Install dependencies and build
npm install

# Build the production app
# This takes 2-5 minutes
npm run build

# Expected: you see '.next' folder created
# If build fails, check the error — usually a missing import or TypeScript error

Start with PM2
# Start the app on port 3001
pm2 start ecosystem.config.js

# OR if ecosystem.config.js doesn't exist yet:
pm2 start npm --name liveportfolio -- start -- -p 3001

# Save PM2 config so it restarts on server reboot
pm2 save

# Set PM2 to run on system startup
pm2 startup
# This outputs a command starting with 'sudo env PATH=...'
# COPY and RUN that command

# Verify the app is running
pm2 list
# Should show: liveportfolio | online

# Check the app logs
pm2 logs liveportfolio --lines 50
# Should show: Ready on http://localhost:3001


Part 6 — Testing (do this in order)
Test each step before moving to the next. Don't skip ahead.

Test 1 — App is running on VPS
# On the VPS, run:
curl http://localhost:3001
# Should return HTML (your landing page)

# If you get 'Connection refused': app isn't running
# Fix: pm2 restart liveportfolio
# Then: pm2 logs liveportfolio --lines 20 to see the error

Test 2 — Caddy is forwarding correctly
# From your laptop/local machine:
curl -I https://liveportfolio.site
# Should return HTTP/2 200 (once DNS has propagated)

# If you get 502 Bad Gateway: Caddy is running but Next.js isn't on port 3001
# Fix: pm2 restart liveportfolio, then check pm2 logs

# If you get SSL error: DNS hasn't pointed to your VPS yet
# Wait 30 minutes and try again after nslookup confirms 46.225.186.103

Test 3 — Domain is working (only after DNS propagates)
# From browser:
# https://liveportfolio.site
# Should show your landing page

# Test subdomain routing:
# http://test.liveportfolio.site  (HTTP only until wildcard SSL is set up)
# Should show your app (even if it shows 404 for that portfolio)
# If it shows your landing page instead of a portfolio = middleware issue

# Verify with nslookup first:
nslookup liveportfolio.site
# Must show 46.225.186.103 before domains will work

Test 4 — Health check endpoint
curl https://liveportfolio.site/api/health
# Should return: {"status":"ok","timestamp":1234567890}

Test 5 — Full user flow
Go to https://liveportfolio.site and test:
•	Landing page loads and looks correct
•	Click 'Create My Portfolio' — goes to the form
•	Fill in the form with your own details
•	Step 3 shows template options
•	Step 4: claim the slug 'test' — sign up with email
•	Generation screen shows animated steps
•	Preview screen renders your portfolio with AI content
•	Health score shows correctly
•	Visit http://test.liveportfolio.site — should show 404 (portfolio not published yet)
•	Pay via test Lemon Squeezy webhook
•	Visit http://test.liveportfolio.site — should show your live portfolio


Part 7 — Update the App (every time you push changes)
After you push changes to GitHub, run this on the VPS to deploy the update:
# SSH into VPS
ssh deploy@46.225.186.103

# Go to app folder
cd /home/deploy/apps/liveportfolio

# Pull latest code
git pull

# Install any new dependencies
npm install

# Build
npm run build

# Reload app (zero-downtime)
pm2 reload liveportfolio

# Verify it's still running
pm2 list

Or if you have deploy.sh: just run sh deploy.sh and it does all of the above in one command.


Part 8 — Troubleshooting (the most common problems)
Problem: App not starting
pm2 logs liveportfolio --lines 50
# Read the error. Common causes:
# - Missing .env.local variable
# - Port 3001 already in use: sudo fuser -k 3001/tcp then pm2 restart liveportfolio
# - Build not done: npm run build

Problem: Subdomain not showing portfolio (shows landing page instead)
# The middleware is not reading the host header correctly
# Check middleware.ts is at the root of your project (not inside app/)
# Caddy passes the Host header by default via header_up Host {host}
# Confirm that line is in the liveportfolio block in /etc/caddy/Caddyfile:
sudo grep -A 20 "liveportfolio.site" /etc/caddy/Caddyfile | grep "Host"
# Must show: header_up Host {host}

Problem: 502 Bad Gateway in browser
# Caddy is running but app isn't / wrong port
# Step 1: check the app is running
pm2 list
# Step 2: check it's on port 3001
pm2 logs liveportfolio --lines 20
# Look for: Ready on http://localhost:3001
# Step 3: verify Caddy is pointing to 3001
sudo grep -A 5 "liveportfolio.site" /etc/caddy/Caddyfile | grep "reverse_proxy"
# Must show: reverse_proxy localhost:3001

Problem: Caddy reload fails
# Check the exact error:
sudo systemctl status caddy
sudo journalctl -xeu caddy.service --lines 20
# Most common: syntax error in Caddyfile
# Fix: sudo caddy validate --config /etc/caddy/Caddyfile
# Fix the reported line, then: sudo systemctl reload caddy

Problem: Nginx tries to start and fails
# This is expected and harmless — Nginx is disabled
# Caddy owns port 80/443 — Nginx cannot start while Caddy is running
# Keep Nginx disabled: sudo systemctl disable nginx
# Do not attempt to run both

Problem: PM2 list shows app as 'errored'
pm2 logs liveportfolio --lines 100
# Read the full error
# Most common: a crash in the app code
# Fix the code error, then: pm2 restart liveportfolio

Problem: DNS not working after 2 hours
# Check if DNS has propagated:
nslookup liveportfolio.site 8.8.8.8
# Must show: Address: 46.225.186.103

# If still wrong IP: go back to Namecheap Advanced DNS
# Confirm the A record Host is exactly @ (not liveportfolio.site)
# Confirm the wildcard is exactly * (just asterisk)
# Confirm Value is 46.225.186.103
# Wait another 30 minutes

Problem: Caddy logs show certificate errors for *.liveportfolio.site
# Wildcard certs require DNS challenge — HTTP challenge cannot issue *.domain certs
# Until the caddy-dns/namecheap module is installed, subdomains work over HTTP only
# The main domain liveportfolio.site has full HTTPS automatically
# Install the DNS plugin when ready for wildcard HTTPS


Part 9 — Claude Code Build Prompts (run in order)
Open Claude Code in your project directory. Run these 12 prompts in sequence. Each one builds on the previous.

Run one prompt at a time. Wait for it to complete before running the next. Do not skip any.

Prompt 1 — Project Scaffold
Create a Next.js 15 project with TypeScript, App Router, Tailwind CSS,
and these dependencies: @supabase/supabase-js, openai, pdf-parse, resend,
sharp. Create a .env.local.example file with these variables empty:
NEXT_PUBLIC_ROOT_DOMAIN, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY,
LEMON_SQUEEZY_WEBHOOK_SECRET, LEMON_SQUEEZY_API_KEY, RESEND_API_KEY.
Set port to 3001 in package.json start script.
Create lib/supabase.ts exporting both a client-side supabase instance
(using anon key) and a server-side supabaseAdmin instance (using service role key).

Prompt 2 — Middleware (subdomain routing)
Create middleware.ts at the project root.
It must read req.headers.get('host').
ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN (liveportfolio.site).
If host === ROOT_DOMAIN or host === 'www.' + ROOT_DOMAIN: route normally.
If host ends with '.' + ROOT_DOMAIN: extract slug by removing '.' + ROOT_DOMAIN,
rewrite request to /portfolio/[slug].
Also handle localhost:3001 as the main app (for local development).
Export config matcher that excludes _next/static, _next/image, api/, favicon.ico.

Add a comment explaining: 'This is the routing brain.
clifford.liveportfolio.site -> rewrites to /portfolio/clifford
liveportfolio.site -> main app routes normally'

Prompt 3 — Database Schema
Create lib/schema.sql with complete Supabase SQL.
Tables: users (id uuid PK references auth.users, email text unique not null,
slug text unique not null, plan text default 'unpublished',
published_at timestamptz, custom_domain text, ls_customer_id text,
created_at timestamptz default now()),
portfolios (id uuid default gen_random_uuid() PK, user_id uuid references
users(id) on delete cascade, template text default 'minimal', content jsonb,
health_score integer default 0, seo_title text, seo_description text,
og_image_url text, view_count integer default 0, edit_count integer default 0,
last_viewed_at timestamptz, updated_at timestamptz default now()),
payments (id uuid default gen_random_uuid() PK, user_id uuid references users(id),
ls_order_id text unique, product_tier text, amount_cents integer,
created_at timestamptz default now()),
email_subscribers (id uuid default gen_random_uuid() PK, email text unique not null,
user_id uuid, portfolio_og_url text, source text, subscribed boolean default true,
sequence_step integer default 0, created_at timestamptz default now()).
Add: ALTER TABLE users ENABLE ROW LEVEL SECURITY;
Add: ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
Add policies so users can only select/update/delete their own rows.

Prompt 4 — Template 1: Minimal
Create components/templates/Minimal.tsx.
TypeScript content prop: { name: string, role: string, headline: string,
about: string, location: string, email: string, github_url?: string,
linkedin_url?: string, avatar_url?: string, skills: string[],
skills_narrative: string, skills_grouped: {category: string, items: string[]}[],
projects: {title: string, problem: string, solution: string, outcome: string,
stack: string[], url?: string}[], experience: {company: string, role: string,
period: string, bullets: string[]}[] }.

DESIGN: Editorial/magazine minimalism. Stripe docs meets senior engineer portfolio.
Font: use next/font to load Playfair Display (headings) + DM Sans (body).
Colors: white background, #0A0A0A text, #1D9E75 teal accent for links only.
Layout: max-width 680px centered, generous whitespace.
Sections: sticky minimal nav, hero (large name + role + headline),
about (2-col desktop: label left, text right), skills (grouped chips),
projects (expandable cards showing problem/solution/outcome + stack chips),
experience (timeline), footer 'Built with liveportfolio.site'.
Fully mobile responsive down to 375px. Hover states on all interactive elements.
Must look like a Framer showcase template in a screenshot.

Prompt 5 — Template 2: Bold
Create components/templates/Bold.tsx with the same TypeScript content prop
type as Minimal.tsx.

DESIGN: Dark-mode engineering showcase. Vercel site meets YC founder portfolio.
Font: use next/font to load Space Mono (headings) + Sora (body).
Colors: #0D1117 background, #F0F6FF text, #58A6FF electric blue accent,
#1C2128 card backgrounds.
Layout: full-width, max-width 900px, fixed left sidebar on desktop
(name + nav + social links + 'Open to work' badge),
main content area on right.
Sections: fixed sidebar (desktop) / top nav (mobile), large hero with
CSS-only typewriter effect for role title, about, skills as interactive
grid with hover effects, projects as large feature cards with gradient
left borders and outcome metric highlighted in accent, experience as clean list.
Sidebar collapses to hamburger on mobile. Fade-in animations on scroll (CSS only).
Must look like a senior developer portfolio that gets hired at a top company.

Prompt 6 — Portfolio Renderer Route
Create app/portfolio/[slug]/page.tsx as a Next.js server component.
Receives params.slug.
Queries Supabase: join users and portfolios where users.slug = params.slug
and users.plan != 'unpublished'.
If not found: return notFound().
If found: render Minimal or Bold component based on portfolio.template,
pass portfolio.content as the content prop.
Set Next.js generateMetadata: title = portfolio.seo_title,
description = portfolio.seo_description.
Set og:image = portfolio.og_image_url.
Include a tiny client component ClientAnalytics that fires
POST /api/analytics with {slug} on mount.

Prompt 7 — 4-Step Create Form
Create app/create/page.tsx as a client component.
Multi-step form with progress bar (Step X of 4).

Step 1 Basics: name (required, 80 char max), role (required, 80 char),
email (required), location, bio textarea (500 char with live counter),
GitHub URL, LinkedIn URL, profile photo upload (shows preview),
PDF CV upload button (calls /api/parse-cv, shows loading spinner,
auto-fills all fields on success).

Step 2 Projects: 1-4 projects. Each: title (80 char), description
(200 char with counter, helper: 'AI will expand this into a case study'),
tech stack comma-separated, URL optional. Add/Remove buttons.

Step 3 Template: 2 cards (Minimal, Bold) with mini visual previews.
Clicking selects with teal border + checkmark.

Step 4 URL: slug input with 500ms debounced /api/check-slug call,
shows clifford.liveportfolio.site preview, green/red availability indicator,
Supabase email+password signup + Google OAuth button, terms checkbox.

On Step 4 submit: show generation screen with animated step labels
(Parsing your information -> Writing your story -> Crafting your case studies
-> Finalising your portfolio), call /api/generate, redirect to /preview/[id].
Style: white background, teal accent, generous padding, mobile-first.

Prompt 8 — All API Routes
Create these Next.js API routes:

app/api/parse-cv/route.ts: POST, multipart PDF, pdf-parse extracts text,
cap at 4000 chars, GPT-4o-mini extracts name/role/email/bio/skills/projects
as JSON, return it. On failure return {}.

app/api/generate/route.ts: POST, requires Supabase auth, input {name, role,
bio, projects, skills, github_url, linkedin_url, template},
cap bio 500 chars / descriptions 200 chars / max 4 projects / max 15 skills,
check user hasn't generated before (1 per account),
GPT-4o-mini with response_format json_object,
system prompt: 'You are a career copywriter for tech portfolios.
Write like a sharp recruiter rewrote their profile.
NEVER USE: passionate, results-driven, highly motivated, leveraging,
cutting-edge, dynamic, innovative, spearheaded, impactful, synergy,
robust, seamless, thought leader, self-starter, team player.
Use concrete specifics. Return valid JSON only.',
save to portfolios table, return {portfolio_id, preview_ready: true}.

app/api/check-slug/route.ts: GET ?slug=x,
check users table + reserved list [api,www,app,admin,blog,help,dashboard,
status,support,login,signup,register,pricing,about,contact,terms,privacy,docs,faq],
return {available: boolean, suggestion?: string}.

app/api/webhook/route.ts: POST, verify Lemon Squeezy HMAC from X-Signature,
on order_created: idempotency check, find user by email,
set plan launch/professional, set published_at=now(), insert payment,
send Resend welcome email.

app/api/analytics/route.ts: POST {slug}, module-level Map for IP+slug
rate limiting (1 per hour), increment portfolios.view_count.

app/api/health/route.ts: GET, return {status:'ok', timestamp: Date.now()}.

Prompt 9 — Preview Page
Create app/preview/[portfolioId]/page.tsx as a client component.
Fetch portfolio from Supabase by ID on mount.
Render the correct template (Minimal or Bold) with content prop.

Health score calculation (0-100, deterministic, no AI):
+10 avatar_url present, +10 github_url, +10 linkedin_url,
+20 for 3+ projects, +5 per project with a number in outcome field (max 15),
+10 bio over 100 words, +10 for 5+ skills, +15 for experience present.
Show as 'Portfolio strength: X/100' green progress bar.
Show checklist of MISSING items only. Each missing item is a button
that scrolls to that field in the form (or highlights it inline).

Small watermark badge: 'Unlock to publish'.
Header banner: 'Your portfolio is ready. Publish it now.'
Template switcher: Minimal/Bold buttons, swap template instantly same JSON.
Inline editing: click any text to edit in place, updates local state.
'Save my progress' link: calls /api/subscribe with email.
Two payment CTAs: 'Publish — $19 Professional' and 'Publish — $9 Launch'
opening Lemon Squeezy checkout overlay URL.
Mobile: CTA button fixed to bottom of screen.

Prompt 10 — Landing Page
Create app/page.tsx as the liveportfolio.site landing page.
Clean, white background, #1D9E75 teal accent.

Sections:
1. Nav: 'liveportfolio.site' logo left, 'Create My Portfolio' teal CTA right.
2. Hero: 'Your professional portfolio. Live in 5 minutes.'
   Subheadline: 'Fill in your info. AI writes the copy. Go live instantly.'
   Large teal CTA button: 'Create My Portfolio →'
   Below: 3 placeholder portfolio preview cards as example links.
3. How it works: 3 steps with icons.
4. Pricing: 2 cards — Launch $9 (one-time) and Professional $19 (highlighted).
5. FAQ: 6 accordion items.
6. Footer: copyright Ecotronics Enterprise, Built with liveportfolio.site link.
Mobile responsive. Smooth scroll.

Prompt 11 — PM2 + Deployment Files
Create ecosystem.config.js for PM2:
app name 'liveportfolio', script 'node_modules/.bin/next',
args 'start -p 3001', instances 2, exec_mode 'cluster', env NODE_ENV=production.

Create .gitignore: node_modules, .next, .env.local, .env, *.pem, *.key.

Create deploy.sh:
#!/bin/bash
set -e
echo 'Pulling latest code...'
git pull
echo 'Installing dependencies...'
npm install
echo 'Building...'
npm run build
echo 'Reloading PM2...'
pm2 reload liveportfolio
echo 'Done. App is live at https://liveportfolio.site'

Create README.md with quick deploy steps.

Prompt 12 — Final Review + Fix
Review the entire codebase and fix any issues:
1. Confirm middleware.ts is at project root (not inside app/).
2. Confirm middleware reads Host header and routes subdomains to /portfolio/[slug].
3. Confirm lib/supabase.ts exports both client (anon key) and supabaseAdmin
   (service role key). Service role key must ONLY be used in API routes.
4. Confirm all API routes return proper error responses (never crash to 500).
5. Add redirect: if user tries to access /create while already logged in
   and has a portfolio, redirect to /preview/[their-portfolio-id].
6. Confirm app/portfolio/[slug]/page.tsx uses supabaseAdmin to read portfolios
   (bypasses RLS for public portfolio rendering).
7. Check all internal links are correct (landing CTA goes to /create, etc).
8. Run through this flow mentally: land -> form -> generate -> preview
   -> pay -> live at slug.liveportfolio.site. List any broken step.


Part 10 — Pre-Launch Checklist
Before going live, confirm each item:
✓	Check
□	Namecheap DNS: A record @ -> 46.225.186.103 and wildcard * -> 46.225.186.103
□	nslookup liveportfolio.site returns 46.225.186.103
□	ssh deploy@46.225.186.103 connects successfully
□	node --version shows v20.x
□	sudo systemctl status caddy shows Active: active (running)
□	Nginx is disabled: sudo systemctl status nginx shows 'disabled'
□	pm2 list shows liveportfolio as 'online'
□	curl http://localhost:3001 returns HTML on the VPS
□	curl -I https://liveportfolio.site returns HTTP/2 200
□	https://liveportfolio.site shows landing page in browser
□	http://test.liveportfolio.site returns a response (even 404 is fine)
□	https://liveportfolio.site/api/health returns {status:'ok'}
□	Full form flow works: landing -> form -> generate -> preview
□	AI generates portfolio content without buzzwords
□	Health score displays correctly on preview screen
□	Lemon Squeezy test payment unlocks portfolio
□	Published portfolio visible at slug.liveportfolio.site
□	Email sent via Resend on payment confirmation
□	pm2 save run and pm2 startup configured for auto-restart

liveportfolio.site — Deployment Guide — VPS: 46.225.186.103
Ecotronics Enterprise — Clifford Nwanna — Every command is copy-paste ready
