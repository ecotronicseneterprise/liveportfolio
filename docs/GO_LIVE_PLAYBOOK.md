# LivePortfolio — Go-Live Playbook
**Owner:** Clifford Nwanna · Ecotronics Enterprise  
**Updated:** June 2026  
**Goal:** First 10 paying users. Then 50. Then content takes over.  
**Rule:** You are not selling. You are helping someone solve a real problem they already have.

---

## MASTER 3-DAY LAUNCH PLAN

This is the primary plan. Execute in order. Do not skip steps.

---

### DAY 1 — Friday: Setup and Launch Prep

#### Hours 0–2: Confirm the subscription flow works end-to-end

Paystack is already integrated. Before anything else, verify it works.

```bash
# SSH into VPS and confirm plan codes are not blank
ssh deploy@46.225.186.103
grep PLAN_CODE /home/deploy/apps/liveportfolio/.env.local
```

Both `PAYSTACK_BASIC_PLAN_CODE` and `PAYSTACK_PRO_PLAN_CODE` must have real `PLN_xxx` values — not empty strings. If either is blank, subscriptions fail silently and you lose every user who tries to pay.

**Test the full flow yourself before Day 2:**
1. Go to liveportfolio.site
2. Fill the form with test details (use a real email you can check)
3. Confirm portfolio preview renders correctly on both Minimal and Bold templates
4. Click "Publish" — confirm the upgrade modal appears with Basic ($9/yr) and Pro ($49/yr)
5. Confirm Paystack popup opens and you can enter card details
6. Complete a test payment and verify your users table in Supabase updates `plan = 'basic'`
7. Check that the confirmation email arrives via Resend

If anything in this chain fails, fix it before you spend a single dollar on ads.

---

#### Hours 2–4: Landing page check and video prep

Your landing page is liveportfolio.site. It is already live. Do not rebuild it.

What you need for the ad: a **30-second promo video**. This is what will stop the scroll.

**Video structure (30 seconds total):**
- 0–5s: Hook. Show the problem. Text overlay: *"Recruiters Google you before they call."*
- 5–15s: Screen recording of filling the form — fast, 2x speed, no dead air
- 15–25s: Screen recording of the portfolio preview appearing — slow down here. Let people see how good it looks. Use the Minimal template with a real-looking name.
- 25–30s: End card. Logo. liveportfolio.site. Text: *"Your portfolio. Live in 10 minutes."*

**How to produce it:**

Option A — Canva Video Editor (fastest):
1. Open Canva → Create → Video (1080x1920 for Instagram Reels/Stories, 1200x628 for Facebook feed)
2. Screen record the form fill and preview using Windows Game Bar: `Win + G` → Record
3. Import the screen recording into Canva
4. Add text overlays using Canva's animation presets (fade in, typewriter)
5. Add background music at 20% volume — use Canva's free music library
6. Export as MP4

Option B — animated video only (if screen recording looks rough):
1. Use Canva's presentation-to-video feature
2. Slide 1: Dark background, white text — *"Recruiters Google you."*
3. Slide 2: *"Most developers have a CV. Few have a portfolio."*
4. Slide 3: Mock portfolio screenshot — Minimal template
5. Slide 4: *"Build yours in 10 minutes. From $9/year."*
6. Slide 5: liveportfolio.site
7. Set each slide to 5 seconds. Export as MP4.

**Merging animated intro with screen recording:**
- Record animated slides as a video (Canva export)
- Record your screen in the app (OBS Studio or Windows Game Bar)
- Open Canva video editor → add animated clip first → drag screen recording clip after → trim and align
- Add text captions over screen recording: *"Filling in your experience..."* then *"Your portfolio — live."*

The final video should be under 40 seconds. No voiceover needed. Text carries it.

---

#### Hours 4–6: Facebook Business Page and LinkedIn brand profile

**Facebook Business Page setup:**
1. facebook.com/pages/create
2. Name: **liveportfolio.site**
3. Category: Software · Career Counseling
4. Description: *"Professional portfolios for developers, designers, and analysts. Build in 10 minutes. From $9/year."*
5. Profile photo: liveportfolio logo (square, 180×180px minimum)
6. Cover photo: screenshot of the Minimal template — add text overlay in Canva: *"Your portfolio. Live in 10 minutes."* Export 820×312px.
7. Username: @liveportfoliosite
8. Action button: Sign Up → https://liveportfolio.site/create
9. Add website: https://liveportfolio.site
10. Turn on messaging and set the away message:
    > "Thanks for reaching out! I'll get back to you within a few hours. Start building your portfolio free right now: liveportfolio.site"

**LinkedIn brand presence:**
You don't need a LinkedIn Company Page immediately — your personal profile is more powerful for the first 50 users.

Update your personal profile now:
- **Headline:** `Software Engineer · Founder @ LivePortfolio · Helping professionals get noticed`
- **Featured section:** Add liveportfolio.site as a link
- **About:** 3 sentences. Your story, why you built it, what it does. Human tone, not a pitch.

---

#### Hours 6–8: Draft Facebook and LinkedIn ad copy

Write all 3 versions of ad copy now, before the campaign launches. You'll pick the best one after Day 3 data.

**Version A — Problem-first:**
> Headline: *Your portfolio. Live in 10 minutes.*
>
> Body: Recruiters Google your name before they call. If nothing comes up, they move on.
>
> LivePortfolio builds a professional portfolio from your experience — free to preview, $9/year to publish permanently.
>
> → liveportfolio.site

**Version B — Aspiration-first:**
> Headline: *Get your professional edge.*
>
> Body: The candidates getting callbacks have one thing in common — a professional online presence that sells them before the interview.
>
> Build yours in 10 minutes. From $9/year.
>
> → liveportfolio.site

**Version C — Social proof (use this once you have 1 testimonial):**
> Headline: *"I had a callback within 3 days of publishing."*
>
> Body: [Name], [Role], Lagos.
>
> Professional portfolios for developers, designers, and analysts. Free to preview. $9/year to publish.
>
> → liveportfolio.site

Run Version A and Version B simultaneously on Day 2. Kill the weaker one after 48 hours.

---

#### Hours 8–10: WhatsApp Business setup and broadcast list preparation

**WhatsApp Business setup:**
1. Download WhatsApp Business (separate from personal WhatsApp)
2. Use a dedicated SIM or your current number if you have no business number yet
3. Business name: **liveportfolio.site**
4. Category: Professional Services
5. Description: *"Professional portfolios for tech professionals. Build in 10 minutes. From $9/year."*
6. Website: https://liveportfolio.site
7. Hours: set to always open (you'll respond when you can)

**Set up Quick Replies** (Settings → Business Tools → Quick Replies):

| Shortcut | Message |
|----------|---------|
| `/link` | Here's the link: liveportfolio.site — free to preview, $9/year to publish. |
| `/how` | You fill in 4 fields about your experience, we write your copy, you pick a template and publish. Takes about 10 minutes. |
| `/pay` | Click "Publish" on your preview page. $9/year via Paystack — card or bank transfer, secure. |
| `/help` | Happy to help — what's your question? |

**Build your broadcast list:**
Go through your contacts and add anyone who fits this profile to a broadcast list named "LivePortfolio Launch":
- Job hunting right now
- Recently changed jobs
- Works in tech (dev, design, data, product, marketing)
- Graduates from bootcamps (Decagon, AltSchool, ALX)
- Studying for a role switch

Target 50–100 contacts for the broadcast. Do not add people who have no connection to tech or career development — your reply rate drops and WhatsApp may flag you.

---

### DAY 2 — Saturday: Launch Ads and Content

#### Hours 0–2: Launch Facebook and LinkedIn ad campaigns

**Facebook/Instagram campaign setup in Meta Ads Manager:**

1. Go to business.facebook.com → Ads Manager → Create
2. **Objective:** Lead Generation
3. **Campaign name:** LP-Launch-Jun2026

**Ad Set settings:**
- **Budget:** $10–15/day (start here, not $50 — test first, scale what works)
- **Schedule:** Start today, run until Sunday 11:59pm
- **Audience:**
  - Location: Nigeria (Lagos, Abuja, Port Harcourt), Ghana (Accra), Kenya (Nairobi)
  - Age: 22–35
  - Interests: Job searching, LinkedIn, Career development, Software development, Data science, UI/UX design, Product management
  - Narrow further by: Recently changed job OR Frequent travellers (proxy for professional ambition)
- **Placements:** Automatic (Meta optimises — let it run)

**Ad creative:**
- Upload the 30-second video from Day 1
- Headline: *Your portfolio. Live in 10 minutes.*
- Primary text: Version A copy from Day 1
- CTA button: Sign Up
- Destination URL: https://liveportfolio.site/create

**Duplicate the ad set** and use Version B copy. This gives you an A/B test from day one.

**LinkedIn campaign (optional, run if budget allows):**
- Go to linkedin.com/campaignmanager
- Objective: Website Visits
- Audience: Job Function = Engineering, Design, Information Technology · Seniority = Entry, Associate, Mid-Senior · Location: Nigeria, Ghana, Kenya
- Budget: $10/day
- Ad format: Single image (use the portfolio screenshot)
- Headline: *Get your professional edge.*
- Copy: Version B

LinkedIn clicks are more expensive ($0.80–2.00 vs $0.10–0.40 on Facebook in Nigeria) but intent is higher. Track separately.

---

#### Hours 2–4: WhatsApp broadcast and personal outreach

**Send the broadcast message** to your list from Day 1:

> Hey 👋
>
> Quick one — I just launched something I've been building for months.
>
> If you're currently job hunting or know someone who is, I'd love to help. I built a tool that creates a professional portfolio from your experience in 10 minutes. It shows recruiters who you are before they even read your CV.
>
> Free to try: liveportfolio.site
>
> If you want, I'll walk you through it personally — takes 10 minutes on a call or I can just help via WhatsApp.
>
> Would mean a lot if you shared this with anyone looking for work right now.

**Personal messages — send individually** to people you know are actively job hunting right now. Do not copy-paste. Personalise each one:

> Hey [Name], I know you're looking for [role/opportunity] right now.
>
> I built something that might help — it turns your experience into a recruiter-ready portfolio in 10 minutes. I'm offering to build yours free this weekend, I just want honest feedback.
>
> liveportfolio.site — want to try it?

Send at least 15 personal messages today.

**When people respond:**
Do not send the link first. Ask one question:
> "What role are you targeting and what's been hardest about the search so far?"

After they answer: offer to help directly, walk through the form with them via WhatsApp, then follow up after they build it.

---

#### Hours 4–6: LinkedIn article

Write and publish a LinkedIn article — this builds authority and gets indexed by Google.

**Title:** *Why your portfolio still matters more than your CV in 2025*

**Structure (600–800 words):**

Paragraph 1 — The problem: *Recruiters have 6 seconds to decide. Your CV isn't enough.*

Paragraph 2 — The shift: *More than ever, candidates are being Googled. What shows up matters. A blank search result is a red flag.*

Paragraph 3 — What a portfolio signals: *Ownership. Initiative. That you take your career seriously enough to present it properly.*

Paragraph 4 — Common objections answered:*"I don't have time." / "I'm not a designer." / "I'll build one later."* — address each in 2 sentences.

Paragraph 5 — CTA: *"I built LivePortfolio to solve exactly this. You fill in your experience, we handle the writing and design. Takes 10 minutes. liveportfolio.site"*

Do not make this a product pitch. 80% education, 20% mention of the product at the end.

Publish it. Then share it as a post on LinkedIn: *"Just wrote about why portfolios are back. The short version: recruiters are Googling you whether you like it or not. Link in comments."*

---

#### Hours 6–8: Set up analytics tracking

You already have portfolio analytics built in (views, referrers, countries in the dashboard). Now add Google Analytics to track the acquisition side — where sign-ups are coming from.

**Google Analytics 4 setup:**
1. analytics.google.com → Create Account → Property name: liveportfolio.site
2. Create a Web data stream → URL: liveportfolio.site
3. Copy the Measurement ID (G-XXXXXXXXXX)
4. Add to your Next.js app:

In [app/layout.tsx](app/layout.tsx), add the GA4 script:

```tsx
import Script from 'next/script'

// Inside RootLayout, after <body>:
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
  strategy="afterInteractive"
/>
<Script id="ga4" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

Replace `G-XXXXXXXXXX` with your real Measurement ID. Deploy after adding.

**What to track in GA4:**
- Events → Conversions: mark `page_view` on `/create` as a conversion
- Set up a Goal for the `/dashboard` page view (= successful sign-up)
- Link GA4 to your Meta Ads account so Facebook conversions flow back

**Key dashboard metrics to check daily:**
- Sessions → `/create` (people who start the form)
- Sessions → `/dashboard` (people who complete sign-up)
- Conversion rate = dashboard sessions ÷ create sessions
- Traffic source breakdown: which ad, which post, which platform is converting

---

#### Hours 8–10: Test and harden the mobile onboarding flow

Open liveportfolio.site on your phone (iPhone SE viewport = 375px is the hard test).

Test every step:
1. Landing page — does the hero load fast? Is the CTA visible above the fold?
2. `/create` — does the 4-step form work on mobile? Can you type in all fields without the keyboard covering inputs?
3. Preview page — does the portfolio render correctly? Is the Publish button easy to tap?
4. Upgrade modal — do both plan cards fit on screen without horizontal scroll?
5. Paystack popup — does it open and work on mobile?

Fix anything that feels broken. Mobile users will be the majority of your traffic from Facebook ads.

---

### DAY 3 — Sunday: Optimise and First User Follow-Up

#### Hours 0–2: Check ad performance

Log into Meta Ads Manager. Look at these numbers only:

| Metric | What it means | Action |
|--------|---------------|--------|
| CPM (cost per 1,000 impressions) | How expensive is your audience | If above $3, broaden interests |
| CTR (click-through rate) | Are people clicking? | If below 1%, change the video/image |
| CPC (cost per click) | How much per visit | If above $0.50, test a different headline |
| Sign-ups | Supabase users created_at during ad window | The only metric that pays you |

**Decision rules:**
- If Version A CTR > Version B CTR: pause Version B, put the full budget on A
- If both CTRs are below 1%: the creative is wrong — reshoot the video with a stronger hook
- If CTR is good but sign-ups are low: the landing page is dropping people — check mobile load time

---

#### Hours 2–4: Adjust and relaunch

Based on Day 3 hours 0–2 data:

- Kill the underperforming ad
- Duplicate the winning ad and test a new headline (swap Version A headline for Version B headline, keep same visual)
- Narrow or broaden the audience based on which country/interest group has the best CTR
- If you have a testimonial from an early user — swap in Version C copy now

---

#### Hours 4–6: Personal follow-up with early sign-ups

Pull a list of everyone who signed up yesterday from Supabase:

```sql
SELECT email, created_at FROM users
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

Message each one personally via WhatsApp or email. Do not use a template — write one sentence specific to them:

> "Hey [Name] — I saw you built your portfolio yesterday. How did it feel to see it live? Anything you'd change?"

Two goals:
1. Get honest feedback you can fix immediately
2. Identify anyone who loved it but hasn't paid yet — those are your first conversions

For anyone who built a portfolio and hasn't published it:
> "Your portfolio is live in preview — have you shared it with anyone yet? Publishing takes it live permanently at [name].liveportfolio.site — $9/year. You'd be one of our first paying users. No pressure, just wanted to check in."

---

#### Hours 6–8: Collect testimonials

You need 3 things from each happy early user:

1. **A quote** — one sentence about what they liked or what surprised them
2. **Permission to use it** — ask explicitly: *"Can I share this on social media with your first name and role?"*
3. **Their portfolio link** — you will screenshot it and post it

Message template:
> "Really glad you like it! Would you be willing to share a quick 1-sentence quote about your experience? I'd love to feature your portfolio as an example for others. Completely optional — but it helps a lot."

If they agree, post it immediately on Facebook and LinkedIn:
> *"Meet [First name], a [Role] from [City]. They built their portfolio in [X] minutes. They said: '[quote]'. See it: [slug].liveportfolio.site"*

Tag them on Facebook (their network sees it — free reach). Do not tag without permission.

This is your most powerful content. One real testimonial post will outperform any ad.

---

#### Hours 8–10: Measure and set Week 2 plan

At the end of Day 3, record these numbers somewhere permanent:

| Metric | Target | Your actual |
|--------|--------|-------------|
| Total sign-ups | 20 | |
| Paying users | 2 | |
| Portfolios built | 10 | |
| WhatsApp replies | 15 | |
| Ad spend | $30–$45 | |
| Cost per sign-up | <$2 | |
| LinkedIn post reach | 500+ | |

**Decisions for Week 2:**
- If cost per sign-up < $2: double the ad budget
- If WhatsApp outreach converts better than ads: pause ads, go heavy on outreach
- If LinkedIn article gets 500+ views: write the next one (keyword: "portfolio for data scientist Nigeria")
- If you have 1 paying user: screenshot their published portfolio, post it everywhere as proof

---

---

## THE OFFER THAT CONVERTS

> "I'll build your portfolio free in exchange for honest feedback and a testimonial."

You are not asking them to pay. Payment comes after they see their name and projects looking professional and want to keep it live.

Conversion sequence:
1. You reach out → offer free build
2. They try it → see how good it looks
3. They want to keep it → you mention $9/year
4. They pay → they share it → their network finds you

---

## PLATFORM-BY-PLATFORM OUTREACH SCRIPTS

### PLATFORM 1 — LinkedIn (do this first, 45 minutes)

#### Update your profile before posting

**Headline:**
> Software Engineer · Founder @ LivePortfolio · Helping professionals get noticed by recruiters

**Featured section:** Add `liveportfolio.site`

**About section:** Write 3 lines. Your story. Why you built this. What it does. Keep it human.

#### Launch post — post this now, make it yours

> I spent months building something I wish existed when I was applying for roles.
>
> Not hearing back is one of the most demoralizing parts of a job search. You know you're capable. But your online presence doesn't show it.
>
> So I built LivePortfolio — you fill in your experience, it generates a professional portfolio in 10 minutes. It tracks who views you, gives you a weekly career score, and shows you how to improve.
>
> It's live at liveportfolio.site
>
> I'm looking for 10 people to try it completely free this weekend in exchange for honest feedback. If you're job hunting or know someone who is — drop a comment or DM me.
>
> No pitch. Just something I think genuinely helps.

Post it. Then spend 20 minutes replying to comments on other people's job-hunting posts with genuine advice. Do not paste your link. Just help. The algorithm rewards this and people click your profile.

#### Direct outreach — 10 DMs today

Search LinkedIn for people who posted recently about job hunting. Use these searches one at a time:

1. "open to work" + "software engineer"
2. "open to work" + "data scientist"
3. "open to work" + "product manager"
4. "open to work" + "UI UX designer"
5. "looking for new opportunities" + Nigeria
6. "job hunting" + developer
7. "actively looking" + engineer
8. "open to work" + "data analyst"
9. "open to work" + "frontend developer"
10. "open to work" + "backend developer"

**DM template — personalise every single one, never copy-paste:**

> Hi [Name],
>
> Saw your post about [their specific situation — "your search for frontend roles", "transitioning into data", etc].
>
> I built an AI tool that turns your experience into a recruiter-ready portfolio in 10 minutes. Looking for honest feedback from real job seekers this weekend.
>
> Would you want me to build yours completely free in exchange for a quick chat about what you think?
>
> Clifford

Send all 10 before moving to the next platform.

#### When someone responds on LinkedIn

Do not send them the link immediately. Ask one question first:

> "What role are you targeting and what's been the hardest part of your search so far?"

Listen. Then offer to build their portfolio. After they try it, ask for feedback. Only then mention that $9/year publishes it permanently.

---

### PLATFORM 2 — WhatsApp (30 minutes)

#### Set up WhatsApp Business first (if not done)

- Business name: **liveportfolio.site**
- Category: Professional Services
- Description: "Professional portfolios for tech professionals. Build in 10 minutes. From $9/year."
- Profile photo: liveportfolio logo
- Website: https://liveportfolio.site

**Set up Quick Replies** (Settings → Quick Replies):

| Shortcut | Message |
|----------|---------|
| `/link` | Here's the link: liveportfolio.site — free to preview, $9/year to publish permanently. |
| `/how` | You fill in 4 fields about your experience, we generate the copy, you pick a template, then publish. Takes about 10 minutes. |
| `/pay` | To publish your portfolio, click "Publish" on your preview page. It's $9/year via Paystack — secure card or bank transfer. |
| `/help` | Happy to help! What's your question? |

**Away message:**
> "Thanks for reaching out to liveportfolio.site! I'll get back to you within a few hours. You can start building your portfolio for free right now at liveportfolio.site"

#### Broadcast message — send to your full contact list

> Hey 👋
>
> Quick one — I just launched something I've been building for months.
>
> If you or anyone you know is currently job hunting, I'd love to help. I built a tool that creates a professional portfolio from your CV in 10 minutes. Shows recruiters who you are before they even read your application.
>
> Free to try: liveportfolio.site
>
> If you know someone looking for work right now — please share this with them. Would mean a lot.

#### Personal messages — send individually to people you know are job-hunting

Go through your contacts. Anyone you know is currently looking for work. Send them this (personalise it):

> Hey [Name], I know you're looking for [role] right now. I just launched a tool that might genuinely help — it builds a professional portfolio from your CV in 10 minutes. Let me build yours for free, I just want honest feedback. liveportfolio.site — want to try it?

Target 10 personal messages.

#### Customer support rules

- Respond within 24 hours. Aim for 2 hours.
- Be warm and personal, never robotic
- When someone shares their portfolio link, compliment something specific about it
- Never send unsolicited messages — respond to inbound only

---

### PLATFORM 3 — Reddit (20 minutes)

Post in each subreddit. Rewrite each one — never copy-paste the same text.

#### r/cscareerquestions

**Title:** `Built a free tool for people not hearing back from job applications — honest feedback wanted`

> I've been thinking a lot about why qualified people don't hear back after applying.
>
> One thing that consistently makes a difference: having a professional online presence that shows your work before a recruiter reads your CV.
>
> I built LivePortfolio — you answer 4 questions, it generates a clean professional portfolio in about 10 minutes. Free to preview, $9/year to publish.
>
> For this weekend: building portfolios for anyone who wants one, completely free, in exchange for 10 minutes of honest feedback.
>
> Site: liveportfolio.site
>
> What's been your biggest frustration with applications lately? Happy to chat.

#### r/forhire

**Title:** `[FREE] Professional portfolio built from your CV — looking for beta feedback`

> Building portfolios for job seekers this weekend at no cost.
>
> You answer 4 questions about your experience, we generate a clean portfolio, you get a permanent link to share with recruiters.
>
> Looking for feedback from people actively job hunting. DM me or go to liveportfolio.site
>
> Works well for: developers, designers, data scientists, product managers, analysts.

#### r/Nigeria and r/lagos

**Title:** `Built something for Nigerian professionals applying locally and internationally`

> Hey,
>
> Built a tool specifically useful for Nigerian professionals applying to roles locally and internationally.
>
> LivePortfolio generates a professional portfolio from your CV in 10 minutes. Recruiters in the UK, US, and Canada increasingly Google candidates before interviews — this gives you something worth finding.
>
> Free to try. liveportfolio.site
>
> Anyone currently job hunting or applying internationally? Happy to help directly.

#### Rules for Reddit

- Never post the same text in multiple subreddits
- Don't drop links in comments on other people's posts unless asked
- Engage in the thread — reply to every comment within 2 hours
- If a subreddit bans links, post without it and say "DM me for the link"

---

### PLATFORM 4 — Facebook (20 minutes)

Facebook Page setup is covered in Day 1 Hours 4–6 above. Once the page is live:

#### Personal profile post — post this on your personal Facebook now

> Just launched LivePortfolio after months of building.
>
> It's a tool that turns your CV into a recruiter-ready portfolio in 10 minutes. If you're job hunting or know someone who is — try it free at liveportfolio.site
>
> Looking for honest feedback this weekend. Build yours and tell me what you think.

#### Groups — post in 3 groups per day, 2 hours apart

Groups to target:
- Tech in Nigeria / Nigerian Tech Community
- ALX Africa alumni groups
- Decagon alumni groups
- Remote Jobs Africa
- Nigerian Professionals Abroad
- Software Engineers in Nigeria
- African Freelancers
- Any bootcamp alumni groups you're in

**Group posting rules:**
- Rewrite the caption for each group — never paste the same text
- Engage with 2–3 posts in the group before posting yours
- Reply to every comment within 2 hours
- If links are banned in the group rules, post without the link: "DM me for the link"

**Group caption formula:**
> [Relatable hook — 1 line about the problem]
> [What you built — 1 line]
> [Offer — free build for feedback]
> [Soft CTA + link or "DM me"]

Example:
> Recruiters Google your name before they call you. If nothing comes up, they move on.
>
> I built a tool that puts your best work front and center in 10 minutes.
>
> Building free portfolios this weekend for anyone who wants one, in exchange for feedback.
>
> Try it: liveportfolio.site or DM me and I'll set it up with you.

---

### PLATFORM 5 — Twitter/X (10 minutes)

Post this as a thread (5 tweets):

**Tweet 1:**
> Not hearing back from job applications is brutal.
>
> I built something to help. 🧵

**Tweet 2:**
> Most job seekers have a CV.
> Few have a professional online presence.
>
> Recruiters Google you. What do they find?

**Tweet 3:**
> I built LivePortfolio — you answer 4 questions, it generates a clean portfolio in 10 minutes.
>
> You get a permanent link. Recruiters see your work before they meet you.

**Tweet 4:**
> It tracks who's viewing your portfolio.
> Gives you a weekly career score.
> Shows exactly how to improve.
>
> Built for developers, designers, data scientists, PMs, analysts.

**Tweet 5:**
> It's live at liveportfolio.site
>
> Building free portfolios for 10 people this weekend in exchange for honest feedback.
>
> Job hunting or know someone who is? Reply or DM me.
>
> RT if this could help someone you know 🙏

---

## Week 2 onwards — content and ad scaling

### Content calendar — Week 1 and repeat

Post this on Facebook Page and LinkedIn. 3x per week. Consistent beats frequent.

| Day | Content |
|-----|---------|
| Monday | Portfolio showcase — screenshot of a demo portfolio + "This is what recruiters see when they Google [Name]." |
| Wednesday | Job hunting tip — "3 things recruiters check before they read your CV" — end with soft link |
| Friday | Question post — "Do you have a portfolio link? Drop it below and I'll give you feedback." |

Do not post every day to start. 3x per week, consistent, for 4 weeks beats 7x per week for 2 weeks then stopping.

---

### UGC — every user is marketing material

When someone builds a portfolio, message them:
> "Hi [Name]! Your portfolio looks great — would you be okay if I shared it as an example? Just drop a one-liner about your experience and I'll post it. Totally optional but it helps others see what's possible!"

When they say yes, post this on Facebook and LinkedIn:
> "Meet [First name], a [Role] from [City]. Built their portfolio in [X] minutes. They said: '[quote]'. See it: [slug].liveportfolio.site"

Tag them on Facebook — their network sees it for free. One testimonial post outperforms any ad.

---

### SEO — blog once a week

Each portfolio page already has unique SEO title and meta description. The blog amplifies discovery.

Keywords to target in order:
1. "why you're not getting callbacks" → promote the existing article
2. "how to build a professional portfolio fast"
3. "portfolio for data scientist Nigeria"
4. "what recruiters look for when they Google your name"
5. "how to get a remote job from Nigeria"

Each post: 600–900 words, one keyword focus, ends with CTA to liveportfolio.site/create. Share to every WhatsApp group and Facebook group after publishing.

---

## Converting free users to paid

After someone builds their portfolio and sees it:

> "Glad you like it. Have you shared it yet?
>
> $9/year publishes it permanently and starts tracking who views you. As one of the first users I'd love for you to be on board. No pressure either way."

One message. No follow-up unless they ask a question.

---

## The gate

50 paying users. Until you hit 50, conversations convert better than ads. Ads amplify what's already proven. Don't wait for ads to replace you.

Come back here after Day 3 and paste your numbers. We'll adjust from there.
