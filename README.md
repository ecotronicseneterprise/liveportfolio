# LivePortfolio
AI-powered portfolio builder that publishes instantly at `username.liveportfolio.site`

Turn your CV or raw experience into a live, professional portfolio in 5 minutes.

## What it does
- Upload your details or CV
- AI rewrites it into professional copy
- Choose a template (Minimal / Bold)
- Pay once
- Get a live portfolio instantly at:

`username.liveportfolio.site`

## Stack
- Next.js 15 (App Router)
- Supabase (Auth + Database)
- OpenAI (content generation)
- Nginx (reverse proxy + subdomains)
- PM2 (process management)
- TailwindCSS

## Key Features
- Multi-tenant subdomain architecture
- AI-generated portfolio copy (no buzzwords)
- 2 professional templates
- One-time payment model
- SEO-ready public pages
- Analytics tracking
- CV auto-parsing

## Architecture
`liveportfolio.site` → main app  
`username.liveportfolio.site` → dynamic portfolio rendering

## Local Setup
```bash
git clone https://github.com/YOUR_USERNAME/liveportfolio
cd liveportfolio
npm install
npm run dev
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
LEMON_SQUEEZY_API_KEY=
RESEND_API_KEY=
```

## Deployment
Uses:
- Nginx reverse proxy
- PM2 cluster mode
- Ubuntu VPS

## Status
🚧 Active development — production SaaS system

