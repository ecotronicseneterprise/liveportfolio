# User journey and conversion audit

**Date:** 2026-10-25  
**Local source:** `dev`, HEAD `c2d2552` at audit start. Production deployment parity was not verified.  
**Verdict:** a credible product and a sensible payment architecture, but not yet a reliably friction-free journey. Fix lost work, typing and payment recovery before buying more traffic or adding an editing agent.

## Evidence and limits

- **Live observation:** visited the public landing page, pricing content and account-first signup screen. No account was created and no payment was initiated.
- **Browser reproduction:** exercised actual local import/manual-review components in headless Chromium at 375 × 812, using a synthetic session and mocked APIs. Confirmed the typing and refresh failures below. This proves frontend behavior, not real authentication or database persistence.
- **Code review:** mapped account/verification/import/review/address/generation, dashboard editing/preview/history/sharing, checkout/verification/grant/webhook, renewals and refund requests.
- **Automated evidence:** 104 tests passed across the four existing billing checkout/copy/panel/refund suites. Supabase, Paystack and email were mocked. Some refund tests exercise a helper not used by the current request-only refund endpoint.
- A further mocked dashboard browser test was skipped at the user's request. Dashboard findings below are source-derived, not browser-reproduced.
- No paid checkout, live webhook delivery, international card, bank-transfer settlement, email deliverability, live refund, real account recovery or all-device certification was performed. The isolated local server was stopped afterward.
- The audit does **not** establish that every interaction has passed end to end. It identifies the main journey's defects, risks and conversion opportunities, and the remaining release tests.

Evidence labels: **B** = reproduced in local browser; **L** = observed on public site; **C** = confirmed source behavior; **R** = source-derived failure scenario requiring a targeted reproduction; **H** = conversion hypothesis, not measured uplift.

## 1. The journey from a user's perspective

| Stage | User's question | Current experience | Best next improvement |
|---|---|---|---|
| Landing | Is this for me? What will I get? | Working portfolio specimen; clear private/free versus paid publication; long, broad headline/audience list | Lead with the outcome, one CTA and a short price reassurance; test role-relevant examples |
| Pricing | What am I paying for? | Basic ₦15,000 / Pro ₦45,000 for 12 months; no automatic renewal; unavailable features labelled | Keep these disclosures; preserve selected plan intent instead of treating every CTA identically |
| Account | Why must I register before seeing my work? | Password account first; 10-character guidance; five-step indicator; no social/OTP buttons visible in the observed signup screen | Explain that signup saves their work; evaluate already-built Google/email-code options after configuration testing |
| Verification | Where is the code? Can I recover? | Code entry, resend and change-account paths in source | Test delivery on mobile/cross-tab; preserve context; make recovery explicit |
| Import | Which option should I choose? | CV recommended; other imports configuration-dependent; manual fallback | Validate files before upload and give actionable failure reasons; keep manual fallback obvious |
| Review | Can I correct the imported data quickly? | Rich preview, but long form with typing/data-loss defects | Fix input handling and autosave; collapse optional details; show what needs review |
| Address | Can I get my name? | Suggested slug and availability checks | Make temporary network errors retryable, not “invalid”; avoid stale availability results |
| Generate | Is it stuck? Have I lost my work? | Safe existing-portfolio guard; generic progress and retry | Bounded request timeouts, useful phases and different actions for validation, quota and network failures |
| First result | Does this look good enough to share? | Free users land in editing; mobile defaults to Edit rather than Preview | Show the finished portfolio first, with Edit and Publish as clear alternatives |
| Edit/design | Did it save? Is this my real selected template? | Mixed immediate and explicit saves; transient previews | One understandable save model, dirty-state protection and one persisted design selection |
| Checkout | Will I get exactly what I saw? | Good price/payment-method foundations; preview and saved content can diverge | Confirm the exact saved portfolio/design and current plan before redirecting |
| Payment return | Was I charged? Am I live? | Polling, reference, retry and support; recovery gaps | Durable payment status, return-after-login, explicit pending/failed/refunded states |
| Sharing | What do I do now? | Dashboard provides links/QR/social sharing | Put View live and Copy link directly on payment success; verify clipboard completion |
| Renewal/refund | Can I trust the promise? | Billing/history/request paths exist | Preserve prior paid access, distinguish renewal from publishing and keep errors retryable |

## 2. Fix before increasing traffic

### F1 — Ordinary skills and certification typing is broken [B, C]

**Observed:** typing `React, Node` produced `ReactNode`. Typing `AWS`, pressing Enter, then typing `Azure` produced `AWSAzure`, not two certification lines.

**Cause:** the controlled fields split, trim and remove empty entries on each keystroke, then immediately join them back. A trailing comma/newline is removed before the next item can be typed.

**Fix:** keep the user's raw input string while typing; normalize on blur/save, or provide accessible item/chip inputs. Test keyboard typing, paste, deletion, IME and mobile entry—not just pre-populated values.

**Acceptance:** a person can type two skills and two certifications normally and see two correctly saved entries.

Source: [review fields](../components/onboarding/ReviewStep.tsx#L195-L257).

### F2 — Review refresh loses corrections [B, C]

**Observed:** entered a synthetic name and role in manual review, refreshed, and the name returned to an empty string. The imported/base draft survives; edits made in the current review screen do not.

**Cause:** review changes remain in component state. `saveDraft()` runs on Continue, not as corrections are made. “The draft is saved” is not equivalent to “my current edits are saved.”

**Fix:** debounced, allow-listed draft persistence with visible saved/unsaved status and navigation protection. Include a real in-memory fallback across steps if browser storage is blocked; the current store's no-op fallback is not a shared cross-page store.

**Acceptance:** refresh, accidental Back, reconnect and session recovery preserve the latest corrections; sign-out still clears local personal data.

Sources: [local review state and Continue](../components/onboarding/ReviewStep.tsx#L37-L80), [save on Continue](../components/onboarding/ReviewStep.tsx#L154-L160), [draft storage](../lib/onboarding/draft.ts#L143-L174).

### F3 — Preview-to-payment is not an exact “buy what I see” handoff [C, R]

- Free preview renders `editContent`, including unsaved changes. Publish opens the modal without saving or checking dirty state.
- Previewing a Pro tile changes `previewTemplate`; it does not save the desired Pro selection for application after purchase.
- Dashboard does not pass `template` into `UpgradeModal`, so its existing Basic-versus-Pro template warning cannot appear there.
- Checkout sends only the tier. Keep server-owned pricing, but add a safe saved-version/desired-design handoff rather than relying on unrelated local UI state.

**Risk:** a person can expect to purchase the words/design they are previewing but publish the previously stored version instead.

**Fix:** explicit Save and continue / Discard / Cancel when dirty; confirm the plan-specific appearance; persist any intended Pro design server-side and apply it only after entitlement verification. Show the resulting public page on success.

**Acceptance:** the saved version shown immediately before payment matches the public result after payment, including when the person was previewing a locked template.

Sources: [preview and publish callbacks](../app/dashboard/page.tsx#L1449-L1464), [modal props](../app/dashboard/page.tsx#L992-L999), [checkout redirect and warning](../components/UpgradeModal.tsx#L76-L119).

### F4 — Expired checkout sessions leave controls disabled [C]

`startCheckout()` sets `busy`, then returns early when no session exists. The reset is after the `try/catch`, not in `finally`, so it is skipped. Reopening clears the error but does not reset `busy`. There is no sign-in link in this error state.

**Fix:** reset busy state on all non-navigation exits, offer Sign in and return to checkout, and handle API 401 distinctly from provider trouble.

**Acceptance:** expire a session immediately before purchase; the user can sign in and resume without refreshing, losing a draft or leaving disabled buttons behind.

Source: [checkout handler](../components/UpgradeModal.tsx#L51-L102).

### F5 — Post-payment sign-in does not return to confirmation [C]

The return screen promises confirmation “as soon as you are back on this page,” but links to the generic sign-in destination without the payment reference or return path. The account state router then normally sends a completed account to the dashboard. Its preferred destinations currently cover onboarding steps, not checkout return.

**Fix:** a strictly allow-listed same-origin payment return destination, durable owned pending-intent lookup, and a dashboard “Check payment status” action. Keep references scoped to the authenticated owner; do not use an arbitrary redirect URL.

**Acceptance:** after payment, lose the session or open the return link in another browser; authenticate, resume the exact payment and reach the correct terminal status without another charge.

Sources: [return sign-in](../app/checkout/return/ReturnClient.tsx#L143-L148), [sign-in entry](../lib/onboarding/entry.ts#L11-L16), [destination routing](../lib/onboarding/state.ts#L61-L72).

### F6 — Payment accounting needs stronger completion/concurrency guarantees [R]

The ordinary idempotency design is useful, but a payment claim is inserted **before** entitlement application. A competing duplicate delivery marks the intent paid without proving that the first delivery finished activation. Verification trusts the paid status and can return `plan: null` if no subscription exists. If the first worker then fails, the user may receive success UI without completed access.

Different references are another issue: checkout creates a new intent each time. Duplicate-event protection does not prevent two payable attempts. Concurrent distinct purchases can calculate extension from the same starting expiry; sequential extra purchases intentionally stack time but may be accidental.

**Fix:** model paid-but-activating separately from activated; transact/serialize entitlement accounting per user, use idempotent completion records, and reconcile failed activation. Reuse or clearly expose pending attempts. Never simply refuse to reconcile an older reference that may genuinely have been charged.

**Acceptance:** inject failures between claim/subscription/user/intent writes; race first webhook and first verification; pay two distinct references concurrently; retry each. Every real payment must have a recoverable, correct entitlement result, with no false “live” success.

Sources: [grant ordering](../lib/billing/grant.ts#L177-L217), [paid shortcut](../app/api/checkout/verify/route.ts#L12-L43), [fresh checkout intents](../app/api/checkout/route.ts#L50-L81).

### F7 — Refunding the latest purchase can remove older paid access [C, R]

The webhook protects newer purchases when an older payment is refunded. But when the latest payment is refunded, `revokeEntitlement()` ends all active/cancelled subscriptions. It does not restore the remaining term/plan bought before the latest renewal or upgrade. Refunding an older purchase also does not recalculate its contribution to stacked time.

**Fix:** define purchase-level entitlement contributions and recompute remaining access after refunds. Preserve unrelated paid time and reconcile upgrades explicitly.

**Acceptance:** buy Basic, upgrade/renew, refund only the newest purchase, and retain the correct earlier paid entitlement. Also test older-payment refunds, repeats and out-of-order events.

Sources: [refund newer-payment check](../app/api/paystack-webhook/route.ts#L350-L374), [account-wide revocation](../lib/billing/grant.ts#L96-L113).

## 3. Next-priority usability and trust fixes

| Finding | Evidence | Change |
|---|---|---|
| Dashboard Refresh overwrites unsaved edits; focus refresh also can after switching away from Edit | C: [state reset/focus refresh](../app/dashboard/page.tsx#L619-L638), [Refresh](../app/dashboard/page.tsx#L1057-L1062) | Separate plan/analytics reload from draft replacement; warn on destructive refresh |
| Free template tiles can save the whole unfinished draft while other design controls require explicit Save | C: [tile save effect](../app/dashboard/page.tsx#L547-L553), [save body](../app/dashboard/page.tsx#L790-L803) | Either explicit save throughout or narrow operation-only immediate design saves |
| Review offers no project/experience Remove button; project heading says “up to 4” while UI permits 20 | B/C: [repeatable sections](../components/onboarding/ReviewStep.tsx#L198-L273), [review wording](../messages/en.json#L60-L94) | Add remove/reorder, clear optionality and one accurate limit |
| Review silently trims bio/project text at Continue without input counters | C: [sanitization limits](../lib/onboarding/draft.ts#L60-L100) | Expose limits while typing and warn before any loss; do not silently truncate |
| Address failures can strand users: network catch sets idle, Continue requires available; in-flight responses are not cancelled | C: [address lookup and save](../components/onboarding/AddressStep.tsx#L36-L89), [button gating](../components/onboarding/AddressStep.tsx#L124-L127) | Abort/version requests, distinguish unavailable/check-failed/taken, add retry and handle save exceptions |
| Generation validation/quota failures become the same “Try again”; fetch has no explicit timeout | C: [failure UI](../components/onboarding/GenerateStep.tsx#L31-L37), [retry helper](../lib/onboarding/generate.ts#L40-L78) | Return to the invalid field, show quota recovery, time-bound calls and preserve draft |
| Terms and Privacy text on signup is not linked | L/C: [terms paragraph](../components/onboarding/AccountStep.tsx#L160-L162) | Link both documents without losing form state |
| Two sign-in surfaces have different recovery/validation behavior; legacy login does not reset CAPTCHA after password sign-in | C: [legacy login](../app/login/page.tsx#L68-L89), [account actions](../components/onboarding/AccountStep.tsx#L58-L86) | Consolidate auth UI or align retry/CAPTCHA, show-password and return-path behavior |
| Dashboard main text fields have visual labels without associated input IDs; modal lacks focus containment/restoration | C: [editor fields](../app/dashboard/page.tsx#L1662-L1690), [modal](../components/UpgradeModal.tsx#L41-L45) | Associate labels, announce errors, implement focus management and background inertness |
| Immediate History undo can replace a dirty draft; transient image previews can survive restore | C/R: [undo](../components/dashboard/HistoryPanel.tsx#L84-L92), [restore](../app/dashboard/page.tsx#L2084-L2093) | Confirm when dirty; clear transient image overrides; state which saved revision is restored |
| Copy link says “Copied” before clipboard completion | C: [copy handler](../app/dashboard/page.tsx#L851-L856) | Await clipboard write; provide selectable URL fallback and an error message |
| Refund request failure hides the retry action | C: [unconditional note](../components/dashboard/PlanBillingPanel.tsx#L90-L97), [button condition](../components/dashboard/PlanBillingPanel.tsx#L153-L158) | Preserve retry on failure; distinguish requested/pending/completed/rejected |
| Renewal opens generic publishing choices; active Pro can be offered Basic and then rejected | C: [renew action](../components/dashboard/PlanBillingPanel.tsx#L122-L132), [Basic rejection](../app/api/checkout/route.ts#L35-L47) | Contextual renew/upgrade checkout with current plan, exact amount and resulting expiry |
| Failed payment says “Nothing has been taken”; success always claims an email was sent | C: [return copy](../app/checkout/return/ReturnClient.tsx#L101-L118), [optional email](../lib/billing/grant.ts#L143-L153) | Describe confirmed facts; acknowledge possible temporary debit; offer receipt/link without depending on email |

**Renewal correction:** a no-auto-renew reminder exists in current source; older project notes saying reminders are not built are stale. Check that legacy automatically renewing subscriptions are excluded from one-time renewal wording and manual-payment nudges. Sources: [selection](../app/api/cron/drip/route.ts#L309-L337), [email](../lib/email-drip.ts#L175-L195).

## 4. Is payment seamless?

**Not yet demonstrated, and the recovery gaps mean it should not be described that way today.**

Keep these strengths:
- Prices agree between display and server; the browser cannot choose the amount or payer.
- Only authenticated owners can verify their payment intents.
- Both signature-checked webhook and authenticated provider verification can activate access.
- No client-enforced restriction to cards; Paystack shows enabled channels.
- Pending confirmation includes the reference, a recheck action and “do not pay again.”
- One-time term, no-auto-renewal wording and the refund guarantee are visible.

Remaining live proof, with explicit owner approval and owner-controlled account:
1. Owner test payment, then an actual Basic purchase; verify exact portfolio content/design, public address, plan and expiry.
2. Cancel/back, declined payment and checkout reopened after session expiry.
3. Delayed bank-transfer confirmation, tab closed before callback, late webhook, and callback before webhook.
4. Return on mobile, a second browser and a poor connection; resume without duplicate payment.
5. Renew, upgrade and refund while retaining previously purchased access correctly.
6. Supported non-Nigerian payment method/currency presentation—not an assumption based on the available SDK.

Do not run this checklist with customer accounts or assume Vercel Preview means sandbox money.

## 5. Conversion improvements after reliability

These are **hypotheses to test**, not promises of a conversion uplift.

1. **Preview-first first result.** On mobile especially, show “Your portfolio is ready” and the actual work before returning users to a long editing form. Primary CTA: “Publish — ₦15,000 for 12 months.” Secondary: “Edit details.” Avoid implying payment is required to keep editing privately.
2. **Progressive review.** Present imported name/title and a finished draft first; expand experience/projects only when the user needs a correction. Label missing optional fields as optional. Do not make perfection a prerequisite to preview.
3. **Clearer first screen.** Test a shorter outcome-led headline, one dominant “Create my free preview” CTA and “Free to build · ₦15,000/12 months to publish.” Keep the interactive specimen; avoid burying value in a long audience list.
4. **Lower authentication effort without weakening security.** Test already-supported Google or email-code entry after real configuration/delivery checks. Keep account-first cost protection; explain why registration is useful. Do not remove email verification just to reduce clicks.
5. **Match plan presentation to intent.** If someone chooses a Pro look, show that exact look and Pro price alongside a truthful Basic alternative. Preserve a landing-page plan choice as intent, not authority over server billing.
6. **Relevant proof, not inflated promises.** Use consented real examples and honestly sourced testimonials/outcomes. The current invented example is labelled; keep that transparency. Replace broad or unsupported competitive claims rather than adding fake social proof.
7. **Shorten post-payment activation.** Success should contain View live, Copy link, the active term and a receipt/reference. Do not require finding these inside the dashboard or waiting for email.
8. **Reduce purchase uncertainty.** Show a durable pending-payment card and Resume/check status before encouraging another purchase. Make support links clickable and prefill a non-sensitive reference.
9. **Explain upgrades before charging.** Quote what is paid now and the resulting term; resolve unused-Basic credit policy before relying on “email us afterward.”

## 6. Measure the funnel honestly

Current instrumentation is incomplete for the account-first journey. The older create wizard contains step/signup events; new onboarding components do not have comparable custom funnel events. Automatic page views are not sufficient to explain failed imports, broken fields or abandoned payment recovery.

There are also measurement defects: `begin_checkout` fires on modal opening with **Basic's ₦15,000 value even for Pro-only flows**; `publish_success` is emitted by the return page without transaction identity and can repeat on revisits. A webhook-only success will not reach that client event. Do not confuse browser events with reconciled revenue.

Sources: [modal events](../components/UpgradeModal.tsx#L51-L75), [return event](../app/checkout/return/ReturnClient.tsx#L64-L69), [legacy events](../app/create/page.tsx#L603-L610), [tracking](../components/TrackingScripts.tsx).

Recommended sequence:
`landing_cta_clicked → signup_started → account_verified → import_started/completed/failed → review_completed → portfolio_ready → plan_selected → checkout_initialized → payment_pending/failed/confirmed → entitlement_activated → first_share`.

- Keep consent requirements. Track supported operational/payment outcomes server-side only under the appropriate purpose/legal basis; send analytics events only where permitted.
- Never send CV text, contact details, portfolio text or full redirect URLs as analytics properties. Use opaque identifiers for deduplication/reconciliation.
- Separate modal opened, selected tier, provider redirect, confirmed payment and completed publication. Deduplicate revenue by owned transaction identity.
- Measure conversion between stages, time to first preview, time to activation, recovery success, errors, refunds and support requests by device and import method.
- Establish a baseline before experiments. Ship bug fixes to everyone; test copy/CTA/layout changes separately. For low traffic, start with a handful of moderated sessions rather than claim statistically significant A/B results.

## 7. Recommended order

**First: stop losing users' work and money-related trust.** Fix F1–F5, add browser regressions, and investigate/reproduce F6/F7 before expanding paid traffic.

**Second: simplify the successful journey.** Preview-first completion, progressive review, consistent saves, accurate limits, contextual checkout and direct sharing.

**Third: instrument and experiment.** Correct funnel events, then test landing copy, auth methods and plan presentation using actual completion and paid-activation data.

**Do not prioritize the granular agent editor ahead of these fixes.** A faster way to edit is not the main conversion bottleneck if normal typing loses separators, review loses corrections, or a paying user cannot recover their session.

No application fixes or production configuration changes were made as part of this audit. This is an evidence-backed backlog, not a release certification.