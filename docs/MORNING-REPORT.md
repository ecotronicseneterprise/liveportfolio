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

### Part B: refund request, upgrade, renewal (simplified after review)
The payment code that was confirmed with the N500 test is **unchanged**: `app/api/checkout/route.ts`, `lib/billing/grant.ts` and the webhook are byte-identical to the overnight base.
- **Refund is a gated request, not an instant refund.** In the Account tab, inside 7 days of paying, a one-time payer sees "Request a refund" (with the deadline), a confirmation that says what happens, and a send button. `POST /api/billing/refund` (`submitRefundRequest` in `lib/billing/refund.ts`) checks, on the server, that the latest payment is the person's own and is no more than 7 days old by server time (`payments.created_at`; exactly 7 days is accepted, 7 days and 1 second is not), and not already refunded. It then e-mails `SUPPORT_EMAIL` (ecotronics.nterprise@gmail.com) the account e-mail, payment reference, plan, amount and paid time, escaped. **It changes nothing and moves no money.** You approve by refunding the transaction in the Paystack dashboard; the existing `refund.processed` webhook then ends the plan and unpublishes the portfolio. To decline, reply to the customer; their plan stays active.
  - The one-click Paystack refund (`requestRefund`, with the atomic claim and revoke) is still in `lib/billing/refund.ts`, tested and unused, for when you want automatic refunds.
  - **Honest result:** the request is reported as sent only if the e-mail was actually sent. If the e-mail key is missing or sending fails, the person is told nothing was sent and to try again (or e-mail the support address), and the claim below is undone.
  - **One request per payment:** recorded without a schema change in `payment_intents.access_code` (only used while a checkout is opening; never read again after payment) with an atomic conditional update. A second request, or two at once, send nothing and show "We already have your refund request"; the panel remembers it across reloads.
- **After 7 days**: no request button; the panel says "Refunds are available for 7 days after payment. Your plan stays active until <date>. It does not renew automatically." Terms section 6 and the FAQ line in `lib/billing/copy.ts` say the same.
- **Upgrade Basic to Pro**: no new pricing logic. A Basic owner sees an "Upgrade to Pro" button that opens the checkout with the **Pro plan only** (the Basic card is hidden, with a short line saying the Basic time left is kept and Pro adds 12 months), then the normal checkout, exactly like Free to Basic. Pro is the full price, and the existing grant adds the 12 months on top of the Basic time left. A note says: "If you would like credit for unused Basic time, e-mail <support address> after you pay." (My guess at the end of your message; change the wording if you meant something else.) An earlier prorated-price version was removed.
- **Renew**: unchanged ("Renew for 12 months", same one-time checkout).

## Decisions
1. Refund goes through a person (you) first. Reason: it stops hop-in, hop-out, and it avoids moving money from an endpoint that cannot be proven offline.
2. Refund window clock is `payments.created_at` (written by the server when the payment is granted), not Paystack's paid time.
3. Payments made outside the one-time checkout (old plan-code payments, manual grants) show the support e-mail line instead of the button.
4. A design picked from the tiles is saved straight away for free accounts.

## Changes to payment code
- `app/api/paystack-webhook/route.ts` (`refund.processed`), added after review: a refund of an OLDER payment no longer ends a plan the person has since paid for again (for example Pro bought after a Basic that is refunded later). Access is revoked only when there is no newer, un-refunded payment; otherwise the payment is just marked refunded and a log line says why. Refunding the newest payment behaves exactly as before. Test added; the existing refund tests are unchanged.
- Checkout and grant: none (byte-identical to the base).
- `app/api/billing/route.ts` (read-only GET): adds a `refund` object (eligible, deadline, tier, amount) to the response; the key is left out when there is nothing to say.
- New: `lib/billing/refund.ts`, `lib/billing/upgrade.ts` (one constant), `app/api/billing/refund/route.ts`.

## Verification
- `npx tsc --noEmit`: clean. `npm run check:llm`: OK. `npm run verify` passed (typecheck, `check:llm`, 819 tests in 35 files, production build). `npm audit --omit=dev`: 0 vulnerabilities. There is no ESLint configuration in the repo (`npm run lint` asks to create one), so lint was not run.
- New tests: refund request (the gate: e-mail content, 7-day boundary, wrong account, already refunded, escaping), the kept one-click refund path (race, failure, missing table), panel states, tile stepping. The existing webhook, checkout and billing tests pass unchanged.
- Real Chrome (CDP, not Playwright) against a production build with a seeded fake session and stubbed Supabase and API: free account at 1440, 768, 390 and 360 (hint, 10 tiles, publish button, no horizontal scroll, tiles at least 44px, zero console errors, zero failed requests); tap, keyboard, pointer swipe, Pro lock prompt, Pro pick not saved, live edit, checkout modal opens. Basic account paid 2 days ago (Request a refund, confirmation, one request call, Upgrade to Pro button) and 12 days ago (no request button, plain wording, Upgrade opens the plan chooser). Screenshots: `C:\Users\Clifford.nwanna\Dev\morning-shots\`.
- Secrets scan of the diff: no keys or tokens; no e-mail address added other than the existing `SUPPORT_EMAIL`.

## Not verifiable offline
- A live refund through Paystack (done by hand by you under the gated design) and the webhook that follows it.
- A real Pro payment by a Basic owner.
- Real-device swipe (headless Chrome with a mouse stands in for touch).
- Interaction cost was not profiled; the preview is debounced and tiles are lazy, but check typing on a mid-range phone.
- Route sweep: every public page and the API entry points were requested signed out against the production build: no 5xx, server log clean. The account-first onboarding routes (`/create/account` and the rest) answer 404 in a build without `NEXT_PUBLIC_ONBOARDING_V2=true`, so they were not swept. Signed-in routes were exercised only through the seeded browser runs above (dashboard, Account tab).

## Known gaps
- Tile thumbnails are about 84px wide renderings of a 1280px page: they show colour and structure, not readable text.
- The dashboard itself still falls back to the browser's default serif font (global Tailwind font-variable issue noted in the overnight report); the new panels inherit it.
- The refund window is measured from when the payment was recorded (`payments.created_at`, seconds after Paystack confirms it), not Paystack's own timestamp. If webhook delivery were delayed, the person would have slightly less than 7 days; say if you want a day of grace.
- `payments.refunded_at` comes from `supabase/manual/20261025100000_payments_refund_idempotency.sql`, which shipped with the release (it is in the base commit and in your merge checklist). I cannot see your database: confirm it was run before relying on refunds.
- A review run on another machine reported `npm run build` failing with `supabaseKey is required` while collecting `/api/admin/bootcamps`. That is the build needing Supabase and e-mail values at build time; with placeholder values it builds cleanly here (`npm run verify` passes), and Vercel has the real ones.
- Someone else has uncommitted edits to `components/onboarding/AccountStep.tsx` and `lib/onboarding/auth-actions.ts` (signup e-mail validation). They are not part of this commit. `messages/en.json` carries their one new line (`errors.invalid_email`), which is harmless on its own.

## Merge checklist
No SQL is needed. Expect a normal Vercel build. Merge the overnight design commit and this one separately if you can; if both go together, any bug is harder to isolate.
Live tests, in this order (all real money; use your own account):
1. Sign up as a new free account, import, generate: it should land on the split Edit view. Tap tiles, swipe the preview, open a Pro tile (lock prompt), edit a field and watch the preview, press Save.
2. Publish my portfolio: pay Basic (or the owner-only N500 test: `/dashboard?test=1`, account = `PAYSTACK_TEST_EMAIL`).
3. Account tab, inside 7 days: "Request a refund" is shown with the deadline. Send a request with the N500 payment first. Check the e-mail arrives at the support address with the right reference and amount; the plan stays active. Then refund it in Paystack and check the webhook ends the plan and unpublishes the portfolio.
4. After 7 days: seed an old payment by hand (the manual-grant SQL in `docs/payment-redesign.md` 2.7 with `created_at` 8 days ago) or wait; confirm there is no cancel button and the plain wording shows.
5. Upgrade: with a Basic plan, "Upgrade to Pro" opens the plan chooser; pay Pro through the normal checkout and confirm the plan becomes Pro.

## Rollback
`git revert <this commit's SHA>` and push (or Vercel Instant Rollback). Nothing in the database changed. A refund already issued stays issued.
