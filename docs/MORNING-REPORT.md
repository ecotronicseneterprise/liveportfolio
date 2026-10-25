# Morning report: free-user conversion dashboard, self-serve refund, Basic to Pro upgrade

Branch `dev` only. Base commit: `7ae5029` (the overnight design commit, unmerged). One commit on top; `git revert <that SHA>` undoes it.
No SQL, no schema change, no setting changed anywhere. `main` is untouched.

## What changed

### Part A: free-user dashboard (accounts with no paid plan)
- A free account now lands on the **Edit Content** tab as a split screen (`components/dashboard/FreeSplit.tsx`, `FreePreview.tsx`).
  - Desktop (1024px and up): the existing edit form on the left (name, role, bio, skills, projects, links; the existing Save, history and undo path is unchanged), the live preview on the right, sticky while the form scrolls. Typing updates the preview after 250 ms.
  - Phone and tablet: two tabs, **Edit** and **Preview**, no cramped split.
- Under the preview: one row of 10 small square tiles (every template, each drawn from the person's own details), a one-line hint ("Tap a design or swipe to compare"), and a first-visit nudge that moves the row once (never with reduced motion, never again after an interaction; remembered in `localStorage`).
  - Tap a tile, press Left/Right/Up/Down/Home/End on the row, or swipe the preview (pointer events, horizontal gesture only, `touch-action: pan-y` so vertical scrolling still works).
  - Roles: `listbox` with `option` tiles, `aria-selected`, a polite live-region announcement of the selected design, visible focus ring, tiles 44px or taller.
  - A **free** tile is selected and saved as the person's design (through the same save path as the Save button). A **Pro** tile previews fully with a lock; it is never saved by a free account and shows "included with Pro" plus a "See Pro" action.
- Performance: one full preview; tiles mount lazily (IntersectionObserver), are scaled, non-interactive and not iframes; no request per tile; the preview content is debounced. Not measured with a profiler (see below).
- Value panel under the tiles, copy from `lib/plans.ts` and `messages/en.json` (`freeSplit.*`): what publishing gives, Basic and Pro in Naira with 12 months, the 7-day money-back line, "does not renew automatically", ONE primary button "Publish my portfolio" opening the existing checkout modal (Basic default, Pro option). Assistant, MCP and GitHub sync are listed as "coming soon, not included yet". No invented numbers, no scarcity, no testimonials.
- Paid accounts keep the normal dashboard (`FreeSplit` renders the form alone when `enabled` is false).

### Part B: refund, upgrade, renewal
- **Cancel and refund** (`POST /api/billing/refund`, `lib/billing/refund.ts`): authenticated; the body is ignored; the server takes the user's latest payment and refunds it only if it is the person's own, made through the one-time checkout (`lpi_` reference), not already refunded, and paid no more than 7 days ago by server time (`payments.created_at`; exactly 7 days is allowed, 7 days and 1 second is not). The amount is always the full original amount: Paystack is asked to refund the transaction reference with no amount.
  - One-only and race-safe: an atomic conditional update of `payment_intents.status` from `paid` to `refunded` is the claim; a double click or two tabs make one Paystack call.
  - On success access ends at once (the same `revokeEntitlement` the webhook uses), then `payments.refunded_at` is set. If ending access fails after Paystack accepted, `refunded_at` stays empty so the webhook's `refund.processed` finishes the job. The webhook's duplicate handling skips a payment already marked.
  - If Paystack refuses or cannot be reached, nothing is claimed as done: the claim is released, the owner is e-mailed at `SUPPORT_EMAIL` (reference, tier and amount only, no personal data), and the person is told the request is pending with the support address.
- **After 7 days**: no cancel button; the panel says "Refunds are available for 7 days after payment. Your plan stays active until <date>. It does not renew automatically." Terms section 6 and the FAQ line in `lib/billing/copy.ts` now say the same (7 days, then no refunds; the existing e-mail refund promise is unchanged).
- **Upgrade Basic to Pro** (this did not exist before; the checkout always charged full price): `POST /api/checkout { tier: 'pro', upgrade: true, expected_kobo }`. The server finds a running Basic plan and computes the price: (Pro - Basic) x days left / 365, rounded **down** to a whole N100, floor N1,000, never above the difference. If the browser's `expected_kobo` is not the current price the server refuses (`price_changed`) so nobody pays an amount they did not see. Without the flag Pro costs the full price exactly as before. The panel shows "Upgrade to Pro for N<amount>" from `GET /api/billing`. A paid upgrade starts a fresh 12 months from payment.
- **Renew**: unchanged. The existing "Renew for 12 months" button (same one-time checkout) stays visible for one-time plans, as before, rather than only in the last 30 days, because an existing panel test asserts that.
- Which payment a refund covers: the panel says "A refund covers your latest payment only" and the confirmation names the plan, amount and date.

## Decisions taken where the brief was unclear
1. **Rounding**: the brief said "rounded up to the next N100 in the buyer's favour". Those disagree; I round **down** (buyer's favour). One constant to flip in `lib/billing/upgrade.ts`.
2. **Refunding an upgrade payment** follows the existing refund rule: the latest payment is refunded and the plan ends (it does not fall back to Basic). The confirmation says so plainly. Say if you want "fall back to Basic" instead.
3. **Refund window clock** is `payments.created_at` (written by the server when the payment is granted), not Paystack's paid time.
4. **Payments outside the one-time checkout** (old plan-code payments, manual grants) are not self-serve refundable; the panel keeps the support e-mail line.
5. A design picked from the tiles is saved straight away (no extra click) for free accounts.

## Changes to payment code (each, as asked)
- `app/api/checkout/route.ts`: optional `upgrade` and `expected_kobo` in the body; price computed server-side only for an upgrade. Behaviour without `upgrade` is unchanged.
- `lib/billing/grant.ts` (`grantIntent`): an upgrade (Pro bought for less than the Pro price) starts a fresh 12 months from now instead of stacking on the old end date. Everything else, including claimPayment and the idempotency, is unchanged.
- `app/api/billing/route.ts`: adds `refund` and `upgrade` to the response (keys are left out when there is nothing to say).
- New: `lib/billing/refund.ts`, `lib/billing/upgrade.ts`, `app/api/billing/refund/route.ts`. The webhook was not edited.

## Verification
- `npx tsc --noEmit`: clean. `npm run check:llm`: OK. `npm run verify` passed (typecheck, `check:llm`, 819 tests in 35 files, production build). `npm audit --omit=dev`: 0 vulnerabilities. There is no ESLint configuration in the repo (`npm run lint` asks to create one), so lint was not run.
- New tests: refund window boundaries (7 days vs 7 days + 1 s), double click gives one Paystack call, wrong user, already refunded, manual payment, Paystack failure path (access kept, claim released, owner told, no personal data in the e-mail), missing table, partial failure; upgrade price boundaries (day 0, day 1 left, day 365, rounding, clamping), checkout upgrade pricing and stale-amount refusal, upgrade grant (fresh term, plain Pro still stacks, idempotent), panel states, tile stepping. The existing webhook, checkout and billing tests pass unchanged.
- Real Chrome (CDP, not Playwright) against a production build with a seeded fake session and stubbed Supabase and API: free account at 1440, 768, 390 and 360 (hint, 10 tiles, publish button, no horizontal scroll, tiles at least 44px, zero console errors, zero failed requests); tap, keyboard, pointer swipe, Pro lock prompt, Pro pick not saved, live edit, checkout modal opens. Basic account paid 2 days ago (cancel and confirm and refund call once, upgrade price) and 12 days ago (no cancel button, plain wording, upgrade request carries `upgrade:true` and the shown amount). Screenshots: `C:\Users\Clifford.nwanna\Dev\morning-shots\`.
- Secrets scan of the diff: no keys or tokens; no e-mail address added other than the existing `SUPPORT_EMAIL`.

## Not verifiable offline
- A live Paystack refund, including whether the channel the payment used can be refunded through the API.
- A real payment, including the upgrade price actually charged.
- Real-device swipe (headless Chrome with a mouse stands in for touch).
- Interaction cost was not profiled; the preview is debounced and tiles are lazy, but check typing on a mid-range phone.
- Route sweep: every public page and the API entry points were requested signed out against the production build: no 5xx, server log clean. The account-first onboarding routes (`/create/account` and the rest) answer 404 in a build without `NEXT_PUBLIC_ONBOARDING_V2=true`, so they were not swept. Signed-in routes were exercised only through the seeded browser runs above (dashboard, Account tab).

## Known gaps
- Tile thumbnails are about 84px wide renderings of a 1280px page: they show colour and structure, not readable text.
- The dashboard itself still falls back to the browser's default serif font (global Tailwind font-variable issue noted in the overnight report); the new panels inherit it.
- Someone else has uncommitted edits to `components/onboarding/AccountStep.tsx` and `lib/onboarding/auth-actions.ts` (signup e-mail validation). They are not part of this commit. `messages/en.json` carries their one new line (`errors.invalid_email`), which is harmless on its own.

## Merge checklist
No SQL is needed. Expect a normal Vercel build. Merge the overnight design commit and this one separately if you can; if both go together, any bug is harder to isolate.
Live tests, in this order (all real money; use your own account):
1. Sign up as a new free account, import, generate: it should land on the split Edit view. Tap tiles, swipe the preview, open a Pro tile (lock prompt), edit a field and watch the preview, press Save.
2. Publish my portfolio: pay Basic (or the owner-only N500 test: `/dashboard?test=1`, account = `PAYSTACK_TEST_EMAIL`).
3. Account tab, inside 7 days: "Cancel and refund" is shown with the deadline. Confirm it with the N500 payment first. Check Paystack shows the refund, the plan is Free, the portfolio is private, and the webhook's later `refund.processed` is logged as already processed.
4. After 7 days: seed an old payment by hand (the manual-grant SQL in `docs/payment-redesign.md` 2.7 with `created_at` 8 days ago) or wait; confirm there is no cancel button and the plain wording shows.
5. Upgrade: with a Basic plan, "Upgrade to Pro for N..." shows the amount, Paystack charges exactly that, the plan becomes Pro with a new 12 months from payment.
6. If Paystack refuses the refund call (some channels), the person sees the pending message and you receive an e-mail at the support address; refund it by hand in Paystack.

## Rollback
`git revert <this commit's SHA>` and push (or Vercel Instant Rollback). Nothing in the database changed. A refund already issued stays issued.
