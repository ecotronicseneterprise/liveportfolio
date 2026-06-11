The audit is clear. Here is the plan, fully aligned with Paystack's email.
The key line from Paystack: "If you enable USD payments, the pricing of your products or services should be in USD... We will settle the payouts into your Zenith Bank USD domiciliary account." So the safe path is: Nigerians pay on the NGN plans (existing, working), everyone else pays on new USD plans — and the money settles in USD to your Zenith dom account. No ambiguity about whether you receive it.
Step 1 — In your Paystack dashboard first (before any code)

Settings → Payments → International payments → confirm it's toggled ON, and enable USD as a payment currency.
Recurring → Plans → Create Plan:

"LivePortfolio Basic USD" — currency USD, amount 9, interval Annually
"LivePortfolio Pro USD" — currency USD, amount 49, interval Annually
If the currency dropdown in the New Plan form does not offer USD, USD isn't enabled yet on the account — tell me and we sort that first.


Copy both new PLN_ codes.

Step 2 — One test before building
Paystack subscriptions + USD is the combination we must verify actually charges. After creating the USD Basic plan, open its plan page in the dashboard — if it shows a subscription/payment page link, open it in your browser and confirm the checkout renders showing $9. Don't pay — just confirm it renders in USD. If it errors, we stop and ask Paystack support before writing code.
Step 3 — Claude Code implementation prompt
Implement dual-currency pricing: Nigerian users see/pay NGN (existing 
flow, unchanged), all other users see/pay USD via new USD Paystack plans.
Read the codebase first. Additive, non-breaking. Show all diffs. 
Do not deploy. End with: "Dual currency complete — ready for review"

─────────────────────────────────────
A. New env vars (.env.local.example)
─────────────────────────────────────
NEXT_PUBLIC_PAYSTACK_BASIC_USD_PLAN_CODE=PLN_
NEXT_PUBLIC_PAYSTACK_PRO_USD_PLAN_CODE=PLN_
PAYSTACK_BASIC_USD_PLAN_CODE=PLN_
PAYSTACK_PRO_USD_PLAN_CODE=PLN_

─────────────────────────────────────
B. Country detection for pricing
─────────────────────────────────────
Create app/api/pricing-region/route.ts (GET, no auth needed):
- Extract client IP from x-forwarded-for / x-real-ip
- Reuse lib/ipinfo.ts getIpInfo() (it already returns country)
- Return { region: 'NG' | 'INTL' }
  - country === 'Nigeria' → 'NG'
  - anything else, null, or lookup failure → default 'NG'
  IMPORTANT: default to NG on any failure. Worst case a US user 
  sees NGN prices (their bank converts, per Paystack), but a 
  Nigerian must NEVER be shown USD prices.
- Cache the result client-side in localStorage for 24h.

─────────────────────────────────────
C. UpgradeModal changes
─────────────────────────────────────
- On mount, fetch /api/pricing-region (or read localStorage cache)
- If region === 'NG' (default): EXACTLY current behaviour. 
  ₦15,000 / ₦45,000, existing NGN plan codes, the ≈$ approximation 
  line stays.
- If region === 'INTL':
  - Display "$9/year" and "$49/year" as primary prices 
    (no ≈₦ approximation needed)
  - Pass the USD plan codes to PaystackPop.setup()
  - ref format: lp-${portfolioId}-${tier}-usd-${Date.now()}
- Everything else in the modal (hierarchy, copy, buttons) unchanged.

─────────────────────────────────────
D. Landing page pricing section
─────────────────────────────────────
Same region logic (read the same localStorage cache / endpoint):
- NG: current display unchanged
- INTL: show $9/year and $49/year
Keep this minimal — a small client hook used by both the modal 
and the pricing section. No layout changes.

─────────────────────────────────────
E. Webhook changes
─────────────────────────────────────
1. Plan detection must now match FOUR codes:
   basic: PAYSTACK_BASIC_PLAN_CODE or PAYSTACK_BASIC_USD_PLAN_CODE
   pro:   PAYSTACK_PRO_PLAN_CODE or PAYSTACK_PRO_USD_PLAN_CODE
2. Store currency: add a currency column usage — migration SQL 
   (I run manually):
   ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';
   ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';
   Webhook writes data.currency from the Paystack payload into both.
3. No other webhook behaviour changes.

─────────────────────────────────────
F. Daily health report
─────────────────────────────────────
Revenue section: report NGN and USD separately. 
"₦15,000 + $9 this month" — never sum across currencies.

RULES
- NGN flow must be byte-for-byte identical in behaviour
- Default to NG region on any detection failure
- tsc --noEmit zero errors
- Show migration SQL separately
On refunds — you're right to simplify
Your Terms currently promise a 7-day no-questions refund. For a one-person team taking international payments, I'd revise it rather than remove it entirely — a "no refunds" policy on subscriptions invites chargebacks, and Paystack's email warns fraudulent transactions get deducted from your payouts. Chargebacks cost you more than refunds (fees + risk flags on your account).
A workable middle ground for the Terms: refunds available within 7 days of first purchase only, for the first billing cycle only, no refunds on renewals, and refunds processed to the original payment method within 10 business days. That keeps you protected from "I forgot to cancel" renewal disputes while giving genuinely unhappy first-time buyers an exit that doesn't become a chargeback. I can draft the exact Terms §5 wording once the dual-currency pass is reviewed — one thing at a time.
Create the two USD plans in the dashboard, confirm the USD checkout renders, then run the prompt and paste the output here.You said: i tried to create the plan, i onkly saw ngn.
User Manual
Login
Contact Us
Get quick answers to your questions about Paystack
Search
We use cookies to analyze website traffic and help improve our visitor experience. Privacy Policy

Reject

Accept
Home
Collections
International payments
Enabling international payments for your buspastedi tried to create the plan, i onkly saw ngn. buy on my dagboard, i saw "activate international payment" i was able to enable it. when i tried to add my dollar account details, i saw that they only psayout to zenith bank account. wheich kead me to the artucle below.5:40 AMClaude responded: This is the key blocker.This is the key blocker. Let me give you a clear picture before you build anything.
What Paystack's documentation confirms:
To receive USD payouts you need a Zenith Bank USD domiciliary account — no other bank works for USD settlements in Nigeria via Paystack. You don't have one yet.
Your two options right now:
Option A — Open a Zenith Bank domiciliary account (correct long-term path)

Fill out the form attached to that Paystack article (NEW INDIVIDUAL ACCOUNT OPENING PACKAGE.pdf)
Go to the nearest Zenith Bank branch
No minimum deposit required (Paystack has confirmed this with Zenith HQ)
Once opened, add it to your Paystack dashboard → Settings → Accounts → Add USD account
Paystack's review team confirms it within 24 hours
Then USD plans work and USD settles to that account

This takes 2–5 business days. Not urgent enough to block the code build but needed before you go live with USD pricing.
Option B — Charge everyone in NGN for now (simplest, zero risk)
Paystack's email confirmed: "By default, payments will be processed in your default currency. Your business in Nigeria can now receive payments from outside Nigeria in Naira. The customer's bank determines the conversion rate."
This means a US user can pay right now with their Visa/Mastercard. Their bank converts their dollars to NGN automatically. You receive NGN. No domiciliary account needed. No extra setup.
The downside: US users see ₦15,000 and ₦45,000 which looks strange to them even though their bank handles the conversion transparently.
My recommendation — do this in order:
This week: Show international users the USD equivalent price in the UI (cosmetic change only — they still pay through the NGN plan, their bank converts). This removes the confusion of seeing Naira amounts.
Next week: Open the Zenith domiciliary account. Once confirmed by Paystack, create the USD plans and switch international users to true USD billing.
The cosmetic fix is one small Claude Code prompt — no new Paystack plans needed:
Small UI change only — no payment flow changes, no new plans.

In components/UpgradeModal.tsx:
- The modal already fetches /api/pricing-region
- For INTL users: show "$9/year" and "$49/year" as the 
  PRIMARY price display
- Below each price add a small note in muted text:
  "Billed as ₦15,000 — your bank converts automatically"
  "Billed as ₦45,000 — your bank converts automatically"
- The actual plan codes used remain the NGN plans (unchanged)
- No PaystackPop changes — NGN plan codes stay as-is

In app/page.tsx pricing section:
- Same logic: INTL users see $9/$49 as primary
- With the same small note below

This is display-only. Zero payment flow changes. Zero new env vars.
Show diff only. Do not deploy.
This takes 20 minutes and means US/Ireland visitors see familiar dollar prices immediately, while you sort the Zenith account in parallel.
Action for you today:

Download the individual account opening form from the Paystack article
Go to your nearest Zenith Bank branch this week
Tell them you want a USD domiciliary account — no minimum deposit required
If they ask for $1,000, email zenithbank@paystack.com with subject "Paystack Merchant Domiciliary Account"

Run the cosmetic fix prompt now so international visitors have a better experience today. Do the Zenith account this week. Implement true USD billing once the account is confirmed.
Shall I write the full cosmetic fix prompt?You said: write the full fix promopt.write the full fix promopt. for context ill attach whats currently implemented . Current Payment Flow
Exact PaystackPop.setup() call (UpgradeModal.tsx):
const handler = PaystackPop.setup({
  key: PAYSTACK_PUBLIC_KEY,
  email: userEmail,
  plan: planCode,
  ref: lp-${portfolioId}-${tier}-${Date.now()},
  callback: () => {
    onClose()
    onPaymentStarted?.()
  },
  onClose: () => {},
})
handler.openIframe()
No currency or amount is passed. The amount and currency are determined entirely by the Paystack plan code itself — whatever is configured in the Paystack dashboard for that plan.
2. Current Plan Codes
Variable    Side    Value
NEXT_PUBLIC_PAYSTACK_BASIC_PLAN_CODE    Client    PLN_xsu4j4jyxo67pe1
NEXT_PUBLIC_PAYSTACK_PRO_PLAN_CODE    Client    PLN_npgms123sd8z2jc
PAYSTACK_BASIC_PLAN_CODE    Server (webhook)    PLN_xsu4j4jyxo67pe1
PAYSTACK_PRO_PLAN_CODE    Server (webhook)    PLN_npgms123sd8z2jc
TEST_PLAN_CODE    Hardcoded    PLN_gzi13ks4vajcdhx (₦500)
There is only one set of plan codes — NGN only. No USD plan codes exist anywhere.
3. User Location Detection
Yes — IPinfo is used, but only for analytics, not for pricing. Flow:
app/portfolio/[slug]/page.tsx extracts the visitor's IP from x-forwarded-for header
Calls lib/ipinfo.ts → https://api.ipinfo.io/lite/${ip}?token=...
Returns country (full name), stored in analytics_events.country
Has a 24hr DB cache per ip_hash
Fire-and-forget — never blocks rendering
Not used anywhere for pricing, routing, or plan selection
4. Paystack Plans — NGN Only
Confirmed. The .env.local.example even has an outdated comment ($9/year, $49/year) but the actual plan codes point to NGN-denominated plans: PLN_xsu4j4jyxo67pe1 (₦15,000) and PLN_npgms123sd8z2jc (₦45,000). No USD plans exist in the codebase or env config.
5. Webhook — Currency Storage
The webhook (app/api/paystack-webhook/route.ts) does not store currency anywhere. It:
Detects plan tier from the ref string format lp-{portfolioId}-{tier}-{timestamp}
Derives 'basic' | 'pro' from the plan code matching PAYSTACK_BASIC_PLAN_CODE
Inserts into payments table with amount_cents (integer) but no currency column
Updates users.plan to 'basic' or 'pro'
6. Upgrade Modal Prices
Prices displayed:
Plan    Primary display    Secondary display
Basic    ₦15,000/year — hardcoded string    ≈ $X/year — dynamic (live Frankfurter API, falls back to $10)
Pro    ₦45,000/year — hardcoded string    ≈ $X/year — dynamic (falls back to $30)
The NGN prices are hardcoded constants (BASIC_NGN = 15000, PRO_NGN = 45000). The USD equivalents are calculated live from the Frankfurter API exchange rate, cached 24hrs in localStorage.Show more5:42 AMClaude responded: Here is the full prompt:Here is the full prompt:
Cosmetic dual-currency display fix for UpgradeModal and landing page.
Read the codebase first. This is display-only — zero payment flow 
changes, zero new plan codes, zero new env vars.
The NGN Paystack plans remain the only plans used for all users.
Show diffs only. Do not deploy.
End with: "Dual currency display complete — ready for review"

─────────────────────────────────────────────────
CONTEXT (read carefully before writing anything)
─────────────────────────────────────────────────
Current state:
- NGN plans only (PLN_xsu4j4jyxo67pe1 Basic, PLN_npgms123sd8z2jc Pro)
- Modal shows ₦15,000/year primary + ≈$X/year secondary (dynamic)
- Landing page shows same
- IPinfo exists in lib/ipinfo.ts but is only used for analytics
- No region detection exists for pricing

What we are building:
- Detect if the user is in Nigeria or international
- Nigerian users: EXACTLY current behaviour, nothing changes
- International users: show $9/year and $49/year as PRIMARY price
  with a note explaining their bank handles the conversion
- Payment flow for ALL users: unchanged NGN plan codes
- Default: always fall back to Nigerian display on any failure

─────────────────────────────────────────────────
STEP 1: Region detection API route
─────────────────────────────────────────────────
Create app/api/pricing-region/route.ts

GET — no auth required — public endpoint

Logic:
1. Extract client IP from headers in this order:
   x-forwarded-for (take the FIRST IP in the comma-separated list)
   x-real-ip
   fallback: '127.0.0.1'

2. Call lib/ipinfo.ts getIpInfo(ip, ipHash, supabaseAdmin)
   to get the country. Use a sha256 hash of the IP as ipHash.
   
3. Determine region:
   IF country === 'Nigeria' → region = 'NG'
   IF country is null OR lookup failed → region = 'NG' (safe default)
   IF any other country → region = 'INTL'

4. Return: { region: 'NG' | 'INTL', country: string | null }

5. Never throw — wrap entire handler in try/catch,
   return { region: 'NG', country: null } on any error.
   A Nigerian user must never accidentally see USD prices.

─────────────────────────────────────────────────
STEP 2: useRegion hook
─────────────────────────────────────────────────
Create hooks/useRegion.ts (client-side hook)

export function useRegion(): { region: 'NG' | 'INTL', loading: boolean }

Logic:
1. On mount, check localStorage for cached region:
   key: 'lp_pricing_region'
   value: { region, country, cachedAt }
   If cachedAt is less than 24 hours ago → use cached value immediately,
   do not fetch. Return { region, loading: false }.

2. If no valid cache: fetch /api/pricing-region
   While fetching: return { region: 'NG', loading: true }
   This means the UI ALWAYS shows NGN prices during the loading state.
   If fetch fails: return { region: 'NG', loading: false }
   If fetch succeeds: store in localStorage with cachedAt = Date.now()
   Return { region: result.region, loading: false }

3. Default is always 'NG' — never flash USD prices before detection.

─────────────────────────────────────────────────
STEP 3: Update UpgradeModal.tsx
─────────────────────────────────────────────────
Import and use useRegion() hook.

FOR NIGERIAN USERS (region === 'NG') — IDENTICAL TO TODAY:
  Primary price: ₦15,000/year (Basic) / ₦45,000/year (Pro)
  Secondary line: ≈ $X/year (existing dynamic Frankfurter calculation)
  Plan codes: existing NGN plan codes (UNCHANGED)
  Button text: unchanged
  Everything else: unchanged

FOR INTERNATIONAL USERS (region === 'INTL'):
  Primary price: $9/year (Basic) / $49/year (Pro)
  — shown in the same visual position as the NGN price
  Secondary line (replace the ≈$X line with):
  "Billed as ₦15,000 — your bank converts automatically"
  "Billed as ₦45,000 — your bank converts automatically"
  — in the same muted small text style as the existing secondary line
  Plan codes: SAME NGN plan codes (NO CHANGE TO PAYMENT FLOW)
  Button text: unchanged
  ref format: keep exactly as is — lp-${portfolioId}-${tier}-${Date.now()}

While loading (loading === true):
  Show NGN prices — never show a blank or flash between prices.

─────────────────────────────────────────────────
STEP 4: Update landing page pricing section
─────────────────────────────────────────────────
Find the pricing section in app/page.tsx.
Import and use useRegion() hook (this is a client component or 
needs to become one — handle that correctly).

Apply the same logic:

FOR NG (default/loading):
  Show current pricing exactly as-is: ₦15,000/year and ₦45,000/year

FOR INTL:
  Primary: $9/year and $49/year
  Below each price in small muted text:
  "Billed in NGN — your bank converts automatically"

CTA buttons on the landing page:
  These open the UpgradeModal — no change needed.
  The modal will handle the correct display independently.

─────────────────────────────────────────────────
STEP 5: Verify zero payment flow changes
─────────────────────────────────────────────────
After making all changes, grep the codebase for:
- PaystackPop.setup
- PAYSTACK_BASIC_PLAN_CODE
- PAYSTACK_PRO_PLAN_CODE

Confirm that every PaystackPop.setup() call still uses the 
exact same NGN plan codes as before. Report the grep results.
If anything changed in the payment flow, revert it.

─────────────────────────────────────────────────
RULES
─────────────────────────────────────────────────
- Zero changes to PaystackPop.setup() calls
- Zero new Paystack plan codes
- Zero new env vars
- Nigerian users: identical experience to today
- Default always falls back to NG — never USD on failure
- No new npm dependencies
- Run tsc --noEmit — zero TypeScript errors
- Show every new file in full, every changed file as a diff
- End with: "Dual currency display complete — ready for review"
Once Claude Code outputs the diffs, the three things I will check before you deploy:

The grep result confirming PaystackPop.setup() is unchanged
That loading: true shows NGN prices (not blank, not USD)
That the try/catch in the region route returns { region: 'NG' } on failure

Paste the output here.Sonnet 4.6 MediumClaude is AI and can make mista





james-chen:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/james-chen.jpg
chidi-okafor:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/chidi_okafor.jpg
fatima-hassan:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/fatima-hassan.jpg
david-mensah:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/david_mensah.jpg
sofia-martinez:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/sofia-martinez.jpg
michael-roberts:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/michael-roberts.jpg
priya-sharma:https://fdvrwnftzszlglyscfwk.supabase.co/storage/v1/object/public/avatars/priya-sharma.jpg