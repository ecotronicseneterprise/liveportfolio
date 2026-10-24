# Onboarding rebuild: Phase A (audit and plan)

Status: **plan only, nothing built.** Written 2026-10-24 on `feat/import-connectors` (merged with `main`'s RLS hotfix). Uncommitted.
No code, SQL, deploy or payment/webhook/`/api/generate` change is proposed for execution without your approval.
Sources: this repo; the Reactive Resume clone at `../reference/reactive-resume` (MIT; read for structure and pacing only, no code copied); `docs/reference-study.md` §6; web search snippets for next-intl and Supabase (the docs pages themselves could not be fetched from this machine, so API names below are **to be re-checked against the current docs at build time**; they are marked *verify*).

The `frontend-design` skill is not installed in this environment (the listed skills are `artifact-design` and others). Section 3 applies its stated principles from your brief instead: distinct identity, one memorable element, no templated defaults.

---

## 0. What the real users changed (recorded, no action taken)

You told me there are now real users (36 generated a portfolio). Things this plan takes from that:

- **Stranded signups exist.** Run this read-only to find them (an auth account with no profile; retry fails with "User already registered"):
  ```sql
  select a.id, a.created_at
  from auth.users a left join public.users u on u.id = a.id
  where u.id is null order by a.created_at desc;
  ```
  One honest "we fixed it, come back" email to them is probably the best-converting message this month. The new flow (section 2) removes the cause.
- **Activation first.** How many of the 36 generated, how many published? Measure before the redesign decides for you.
- **Free-Pro grants for real users:** do them in a way the code recognises: an invite/bootcamp mechanism or a `subscriptions` row with an expiry (not only `users.plan`, because the billing branch makes `subscriptions.expires_at` the source of truth); mark them (for example partner/bootcamp code `founding-users`) so audit queries do not flag them; give an end date (for example 12 months), because Pro includes the weekly AI score and "forever" is a permanent cost.
- **Privacy stakes are higher.** The policy must say accurately what goes to OpenAI. `/api/generate` still sends email and URLs (section 7).

---

## 1. Signup audit (email + password only)

### 1.1 Every auth provider and path in the code

| Path | Where | Notes |
|---|---|---|
| `supabase.auth.signUp({email,password})` | `app/create/page.tsx` `handleSubmit` (step 4 submit, ~line 600) | **Only** place accounts are created. Browser client (`getSupabaseClient()`, supabase-js default *implicit* flow, session in `localStorage`). No `emailRedirectTo`, no captcha. |
| `signInWithPassword` | `app/login/page.tsx:61`; `app/dashboard/page.tsx:810` (re-auth before password change) | |
| `resetPasswordForEmail(email,{redirectTo: origin/reset-password})` | `app/login/page.tsx:80` | |
| `onAuthStateChange` → `PASSWORD_RECOVERY`, `updateUser({password})` | `app/reset-password/page.tsx:24` | Depends on the implicit flow (tokens in the URL hash). Breaks if the client ever switches to PKCE. |
| `auth.admin.deleteUser` | `app/api/delete-account/route.ts` | Service role. Works even when no `users` row exists. |
| Bearer-token verification `auth.getUser(token)` | `generate`, `account/profile`, `update`, `score`, `upload-*`, `bootcamp/redeem`, `admin/invite/consume`, `user-plan`, `delete-account`, `subscribe` (optional) | Pattern is consistent. |
| `app/auth/callback/route.ts` | **Referenced by nothing** (no `emailRedirectTo` anywhere). Calls `exchangeCodeForSession(code)` from a bare server client that has no PKCE verifier, so it cannot succeed. | Dead and broken. Remove or replace (section 1.6). |

**Not present:** Google/GitHub or any OAuth, magic link, phone/OTP, anonymous sign-in, MFA. `@supabase/ssr` is a dependency but unused.

### 1.2 Exact flow today: landing CTA to generated portfolio

1. `app/page.tsx`: three `Link href="/create"` CTAs ("Build My Portfolio →").
2. `app/create/page.tsx`: **entry choice** (`entryChoice`, ~line 880): upload CV, GitHub username / pasted text (flag-gated), or manual.
   - CV: `POST /api/parse-cv` (**no auth**, in-memory 3/IP/hour).
   - GitHub/text: `POST /api/import` (**no auth**, flag `IMPORT_ENABLED`, in-memory 10/IP/day + a global daily cap).
3. Steps (`STEPS`, line 65): Basics → Projects & Experience → Template → "Claim Your URL" (slug + password + confirm + terms checkbox).
4. `handleSubmit` on step 4, in this order, all after the form is complete:
   1. `signUp` (browser). If no session comes back: error "Check your email for a verification link…".
   2. `POST /api/account/profile` (creates `users` row; idempotent).
   3. `email_subscribers` insert **from the browser** (errors swallowed; RLS probably blocks it, so drip enrolment may be silently failing: verify).
   4. Invite consume, bootcamp redeem (server routes).
   5. Uploads: `/api/upload-project-image`, `/api/upload-avatar` (service-role storage).
   6. `POST /api/generate` (verifies token; returns the existing portfolio if one exists; else OpenAI, then inserts with the service role).
   7. Fire-and-forget `POST /api/email/welcome`; `router.push('/preview/<id>')`.
5. `app/preview/[portfolioId]/page.tsx` reads `portfolios`/`users` with the user's own session (SELECT policies), calls `/api/user-plan`, shows the paywall.

### 1.3 Behaviour with "Confirm email" ON vs OFF

| | OFF (assumed today) | ON |
|---|---|---|
| `signUp` returns | user **and session** | user, **no session** |
| Where the profile row is created | Step 4 submit, immediately | **Never**, in today's code: the page throws at `!authData.session` before the profile call |
| Returning user | `signUp` with the same email errors "User already registered" (**account enumeration**; retry impossible) | `signUp` for an existing confirmed email returns an obfuscated user with `identities: []` and no session: today's page shows "Check your email…" forever (**permanent loop**) |
| Link in the email | n/a | Default template links to Supabase's verify endpoint, then to the Site URL with tokens in the hash. Nothing in our app consumes that for signup. |
| Result | Works, with the stranding bug | **Broken**: nobody can finish signup |

So today's app only works because confirmation is OFF, and OFF means anyone can register any address (no ownership proof; welcome/drip mail goes to addresses nobody verified).

### 1.4 Other findings

- **Password rules:** client-side only: `length >= 8` (create ~line 587, reset page line 32). Server-side minimum is whatever Supabase is set to (default 6; *unverified*). No composition or breach check.
- **Error messages / enumeration:**
  - signUp passes Supabase's raw message to the user ("User already registered" when confirmation is OFF).
  - Login maps "invalid" to "Wrong email or password" (good); any other message is passed through ("Email not confirmed" confirms the address exists).
  - Reset sends the same success state either way (good).
  - `POST /api/account/profile` returns `email_in_use` on a unique violation (the create page maps it to a generic message, but the API response is distinguishable).
  - `check-slug` must reveal "taken" (inherent).
  - **Wrong message bug:** `/api/check-slug` answers invalid *and* reserved slugs with `available:false`; the UI maps every `available:false` to "✗ That URL is taken" (`create/page.tsx` ~line 441 and ~1648). A slug like `ada-` says "taken".
- **Rate limits / captcha:** none on `signUp`/`signIn` beyond Supabase defaults; no captcha. App-level limiters are all **in-memory per serverless instance** (check-slug 10/min, parse-cv 3/hr, import 10/day, generate 5/day per IP, profile 5/min per user), i.e. close to useless on Vercel.
- **Password reset:** works with the implicit flow; `redirectTo` is `window.location.origin + /reset-password` and must be in the Supabase redirect allow-list.
- **Redirect handling:** no `next`/`returnTo` parameters anywhere (so no open-redirect today). The new flow will add one; it needs a same-origin path allow-list (Reactive Resume's `redirect.ts` shows the idea: only paths starting with a single `/`, no `//`, no backslash or control characters; write our own).
- **Security finding, unrelated to auth but on the signup path:** `POST /api/email/welcome` is **unauthenticated**, takes `email`, `name`, `slug` from the body and puts `name`/`slug` unescaped into HTML. Anyone can send a branded email from your Resend account to any address with arbitrary markup. It needs: Bearer auth, recipient = the token's email, escaped fields. (Needs your approval; not touched.)
- **`/api/parse-cv` and `/api/import` are anonymous LLM endpoints.** Plan: require auth (section 2.3).

### 1.5 Pages and APIs that assume a `users` row exists

| Place | Behaviour with an authenticated user who has **no** `users` row |
|---|---|
| `app/dashboard/page.tsx:565-570` | `router.push('/create')` (OK, but lands on the old wizard) |
| `app/login/page.tsx` (session redirect) | checks `portfolios` only; no portfolio → `/create` |
| `app/create/page.tsx` mount | redirects to preview only if a portfolio exists |
| `app/preview/[portfolioId]/page.tsx:329,413` | portfolio query first; `users` missing → blank slug/email, paywall shows without an email |
| `/api/generate` | inserts `portfolios` with a FK to `users`: **fails with a generic 500 "Failed to save portfolio"** (no `profile_required` code). Not touched (protected) |
| `/api/update:55,145`, `/api/user-plan`, `lib/getUserPlan.ts` | 403/“free” |
| `/api/paystack-webhook` `findUser` | no user → ignored (payment lost, logged) |
| `/api/admin/invite/consume`, `/api/bootcamp/redeem` | update/select by id → no-op or 404 |
| `/api/delete-account` | works (delete is a no-op, then `deleteUser`), but a stranded user cannot reach any UI to call it |
| `PublishedCount` (landing) | anonymous browser `count` on `users`; with `users_select_own` only, it returns 0 for visitors, so the line **never renders** (*verify against your 9 live policies*) |

The new flow centralises this in one function (`getAccountState`, section 2.2).

### 1.6 Making "Confirm email" ON safe (callback fix)

Why the server callback cannot work: PKCE needs the code verifier that the *browser* stored when it started the flow; `app/auth/callback/route.ts` has none. Why the Supabase SSR `/auth/confirm` route (token_hash + `verifyOtp` on the server) alone does not help us: it would set **cookies**, but this app keeps sessions in `localStorage` and sends `Authorization: Bearer` from the client everywhere, so the client would still be signed out.

**Recommended (small, keeps the current architecture):**

1. **Code-first verification.** The "Confirm signup" email template contains the 6-digit `{{ .Token }}` prominently and a secondary link. The verify screen takes the code: `supabase.auth.verifyOtp({ email, token, type })` (*verify the exact `type` for signup confirmation in the current docs: `email` vs `signup`*). Works on the device where the user started, has no link-scanner problem, and no cross-device problem.
2. **Link fallback page** `app/auth/confirm/page.tsx` (client): reads `token_hash`, `type`, `next`; shows a **"Confirm my email" button** (a scanner or prefetch cannot consume the token; Supabase's own guidance mentions this); on click calls `verifyOtp({ token_hash, type })` in the browser, which creates the session in `localStorage`; then `router.replace(safeNext)`. Template link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/create` (*verify parameter names*). Same page serves `type=recovery` (password reset) and `type=email_change`.
3. **Reset page** stops depending on the `PASSWORD_RECOVERY` hash event: after `/auth/confirm` verifies a recovery token there is a session, and the reset page just checks `getSession()`.
4. **Delete `app/auth/callback/route.ts`.** Remove `@supabase/ssr` from `package.json` unless Option B is chosen.
5. If the user opens the link on another device they are signed in *there*; the draft (section 2.2) is local, so that device starts at "import". Acceptable; the code path avoids it.

**Option B (not recommended now):** migrate the whole app to `@supabase/ssr` cookie sessions with a refresh middleware and `createBrowserClient`/`createServerClient`. It is the "official" shape, but it touches every page and every `Authorization: Bearer` call, and interacts with `middleware.ts` (single-segment slug rewrite). Large, and not needed to turn confirmation on.

### 1.7 Recommended Supabase Auth settings (you apply them; settings only)

| Setting (Dashboard → Authentication) | Recommendation |
|---|---|
| Providers → Email → **Confirm email** | **ON**, but only after `/auth/confirm` and the new account step ship |
| Email → **Minimum password length** | 10 (new accounts). No composition rules (NIST-style); length + breach check beat symbols |
| **Leaked password protection** (HIBP) | ON if your plan includes it (*verify: it is a paid-plan feature at the time of writing*) |
| Attack Protection → **CAPTCHA** | Cloudflare Turnstile (free), enforced for sign-up, sign-in and password reset; site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret in the Supabase setting. Free, accessible, no Google dependency |
| URL Configuration → **Site URL** | `https://liveportfolio.site` (the email template uses it) |
| URL Configuration → **Redirect URLs** (allow-list) | `https://liveportfolio.site/**`, `http://localhost:3001/**` for local dev (the dev script uses port 3001). Add Vercel preview URLs only if you test auth on previews, and then a specific pattern, not `*` |
| Email templates | Confirm signup, Reset password, Change email: code + link as in 1.6 |
| **SMTP** | Custom SMTP (Resend) with a verified sender domain. The built-in Supabase mailer is heavily rate-limited and meant for testing; confirmation mail is on the critical path |
| Rate Limits | Lower sign-ups and sign-ins per hour per IP and email sends per hour to what you actually expect |
| Sign In / Providers → **Allow anonymous sign-ins** | OFF |
| Sessions | Keep refresh-token rotation and reuse detection ON; JWT expiry default 1 hour is fine |
| Email OTP expiry | 10 minutes or less |
| Delete/ban | Know where to ban a user (Auth → Users) for abuse |

Order: ship code → set Site URL, redirects, templates, SMTP, Turnstile → test with a plus-addressed mailbox → turn Confirm email ON → watch signups.

---

## 2. The new flow

### 2.1 Principles

1. **Account first, then everything else.** One screen: email + password, a toggle between **Create account** and **Sign in**. "Already registered" switches to sign in with the email prefilled. If a session already exists, `signUp` is never called.
2. **Every step is idempotent and retryable.** A failure anywhere leaves the user one click from where they were, never in a state the UI cannot leave.
3. **No LLM call without a verified, signed-in user.** `/api/parse-cv` and `/api/import` become authenticated with per-user limits (2.3).
4. **State comes from the server, not from the wizard.** `getAccountState` decides where a signed-in person belongs.

### 2.2 Screens and state machine

```
landing --"Make my portfolio"--> /create/account
   no session ........................ /create/account   (create | sign in, Turnstile)
   session, email not verified ....... /create/verify    (6-digit code, resend, change email)
   session, no draft ................. /create/import    (CV file | GitHub | paste | start blank)
   session, draft ready .............. /create/review    (edit what was read; template; 4 projects max)
   session, reviewed, no users row ... /create/address   (name-prefilled slug, live availability)
   session, users row, no portfolio .. /create/generate  (progress; retry-safe)
   session, portfolio ................ /preview/<id>     (existing)
```

`getAccountState(session)` returns `no_session | unverified | no_profile | no_portfolio | ready` using: `session`, `user.email_confirmed_at`, `GET /api/account/state` (new, Bearer; returns `{profile: bool, slug, portfolioId}` using the service role). A client hook and `/create/*` layouts redirect to the right step; `/login`, `/dashboard` and `/preview` use the same function (this is the "authenticated but no `users` row" handling everywhere, instead of per-page guesses).

Draft: the review form state lives in `localStorage` (`lp_draft_v1`, versioned, cleared after a portfolio exists). No new table. Trade-off: opening the confirmation *link* on another device loses the draft (the code path avoids this).

Idempotency of each step:

| Step | Call | Retry behaviour |
|---|---|---|
| Account | `signUp` / `signInWithPassword` | `signUp` only when no session; "already registered" → sign-in |
| Verify | `verifyOtp` / `resend` | Resend has a 60 s cooldown; a used code shows "ask for a new code" |
| Import | `POST /api/import` / `/api/parse-cv` (authenticated) | Safe to repeat (counts against the per-user limit) |
| Address | `POST /api/account/profile` | Already idempotent (returns the existing row). The 409 response gets `suggestions[]` |
| Generate | `POST /api/generate` | Already returns the existing portfolio. The client retries up to 3 times with backoff and treats a 5xx/504 as "still working", not failure |
| Preview | read | n/a |

Edge: the user closes the tab after the address step but before generate → next visit `getAccountState` = `no_portfolio` → `/create/generate` runs with the saved draft (or, if the draft is gone, goes back to `/create/import`).

### 2.3 LLM routes need auth and per-user limits

| Route | Today | Plan |
|---|---|---|
| `/api/parse-cv` | anonymous, 3/IP/hour in memory | Bearer required; 5 per user per day |
| `/api/import` | anonymous, 10/IP/day in memory + global daily cap | Bearer required; 10 per user per day; keep the global cap |
| `/api/score` | Bearer | add per-user limit (cache already 7 days) |
| `/api/generate` | Bearer, 1 per user lifetime, 5/IP/day in memory | **protected, untouched**; the IP limit is ineffective on Vercel but the lifetime cap is the real guard |

Per-user counters need persistence (in-memory does not work across instances). Proposal (**migration file only, you run it**): `usage_events(user_id uuid, kind text, at timestamptz default now())`, index `(user_id, kind, at)`, **RLS enabled and anon/authenticated grants revoked in the same migration** (the rule added after the incident), written only by service-role routes. Count rows in the window, then insert. This can later share a table with the MCP `audit_log` (the Phase 2 design derives rate limits from `audit_log` counts), so decide once. Add the Vercel Firewall rate-limit rule on `/api/*` as the outer layer.

Also required: `/api/email/welcome` authenticated and escaped (1.4).

### 2.4 The address step (slug)

- Prefill from the name: Unicode NFKD, strip diacritics and non-ASCII, lowercase, spaces to hyphens, collapse repeats, trim hyphens, 3–30 chars, e.g. "Ada Okonkwo" → `ada-okonkwo`. If the result is under 3 characters (non-Latin names) use `me-` plus 4 random characters, and say so.
- Format and reserved checks run **in the browser** from the shared `lib/slug.ts` (pure, no network), so errors are instant and precise. Availability uses `check-slug`.
- `check-slug` response becomes `{ available, reason: 'invalid' | 'reserved' | 'taken' | null, message, suggestions[] }`. The UI shows: *invalid* → the format rule in plain words ("Use 3–30 letters, numbers or hyphens. No hyphen at the start or end."), *reserved* → "That address is reserved.", *taken* → "That address is taken." with suggestions. **"Taken" is shown only for `taken`.**
- Submit calls `/api/account/profile`; a 409 race shows the suggestions inline.

**Slugs are unchangeable today. Recommendation:**
1. Until first publish, allow changing the slug freely (new route `POST /api/account/slug`, Bearer, same validation, only while `plan='unpublished'`; nothing external points at an unpublished address).
2. After publish, allow **one self-serve change** with a redirect from the old slug for 12 months (a small `slug_redirects(old_slug, user_id, expires_at)` table, **migration file only**, the portfolio page checks it before 404). Until that exists, handle post-publish changes by support.
3. Always reserve a released slug for 90 days so nobody can take over an address that people still link to.

### 2.5 Failure handling (the addendum)

| Failure | Behaviour |
|---|---|
| Closed tab / network drop after account creation | Next visit: session found → `getAccountState` → resumes at the right step. No second `signUp` |
| "User already registered" (confirmation OFF) | Switch to sign-in with the email filled and the line "You already have an account. Sign in to continue." |
| `signUp` returns `identities: []` (confirmation ON, existing user) | Neutral text ("If this address is new we've sent a code. If you already have an account, sign in."), toggle to sign-in |
| Verify code expired/used | "Send a new code" |
| Profile 409 (slug) | Inline suggestions; the account and draft are kept |
| Generate timeout / 5xx | Auto-retry x3, then "Try again" button; never asks for the password or the form again |
| OpenAI down | Existing fallback content path inside `/api/generate` (unchanged) |

### 2.6 Vercel settings note (not a code change)

`/api/generate` has no `maxDuration`, and the OpenAI call can take 5–12 s. In Vercel → Project → Settings → **Functions**: confirm **Fluid compute** is enabled and set the **Function Max Duration** to at least 30 s for the project (or raise it only for `app/api/generate`, which would need a route-level `export const maxDuration` — a code change in a protected file, so it is only a settings recommendation here). Defaults depend on plan and on whether Fluid compute is on (*verify in the dashboard*; as I understand the current docs, with Fluid compute the default is 300 s, without it Hobby is 10 s and Pro 15 s). Also confirm the same for `/api/import` and `/api/parse-cv` (PDF parse + LLM).

---

## 3. Design plan

### 3.1 Concept

**"From page to site."** The product's emotional moment is a person seeing their own CV become a real site at their own address. The landing page is one scroll story built around that moment and nothing else shouting. Typewritten document on the left, live site on the right, the address typing itself into a URL bar, one small green "live" signal. That is the single memorable element; the rest is still, paper-and-ink quiet.

Pacing and structure taken from Reactive Resume (not its brand, visuals or words): **one scroll story, a live demo in the hero, one primary CTA repeated, quiet sections between.** (Theirs pins scenes with scroll-driven CSS variables and server-prerenders the page; ours is simpler: no scroll-jacking, one autoplay moment, everything server-rendered.)

### 3.2 Palette (6 named colours; contrast measured)

| Name | Hex | Role | Contrast |
|---|---|---|---|
| **Paper** | `#F4EFE4` | page background | – |
| **Ink** | `#15120D` | text, primary buttons (Paper text on Ink) | 16.3:1 on Paper |
| **Graphite** | `#55504A` | secondary text | 7.0:1 on Paper |
| **Live** | `#0B7A5A` | the "live" signal, links, the single accent | 4.6:1 on Paper (AA for body text) |
| **Night** | `#0F1A15` | the one dark band: hero's site panel and closing section | Paper on Night 15.5:1 |
| **Lit** | `#4ADE9F` | Live's twin on Night only (dot, caret) | 10.4:1 on Night |

Hairlines are Ink at 14% opacity (not a named colour). Never Graphite on Night (2.2:1). No gradients, no shadows, no blue: this deliberately leaves the current `#0A66C2` "SaaS blue" and the Minimal template's `#1D9E75` untouched (templates keep their own palettes per CLAUDE.md).

### 3.3 Type roles (no Inter, Arial or Roboto)

| Role | Face | Use |
|---|---|---|
| Display | **Fraunces** (serif, one static weight, e.g. 600) | headline, section titles, the closing line |
| UI / body | **Hanken Grotesk** (400, 600) | everything else |
| Document / URL | **Space Mono** (400) | the CV sheet and the address bar in the hero moment; already used by the Bold template, so the file is shared |

All three via `next/font` (self-hosted, subset `latin`, `display: swap`, size-adjusted fallbacks). Budget: three families, **≤ 4 font files** on the landing, only Fraunces preloaded (it is the LCP text). Sizes to be measured in Phase B; if Fraunces misses the budget, the fallback is a system serif stack with `size-adjust`.

### 3.4 Layout concept and wireframes

Asymmetric, paper-like, left-aligned text on a 12-column grid with generous block spacing; sections separated by hairlines, not cards; numerals set in the display face; no uppercase tracked eyebrow labels, no pill badges, no three-card rows.

Desktop hero (`min-height: 100svh`):

```
┌────────────────────────────────────────────────────────────────────────────┐
│ LivePortfolio                                          Sign in   [Make my portfolio] │
│                                                                            │
│  Your CV,                      ┌─ cv.txt ─────────┐   ┌── liveportfolio.site/ada▍──┐ │
│  as a site                     │ ADA OKONKWO      │   │ ● Live                     │ │
│  people can open.              │ Backend engineer │ → │ Ada Okonkwo                │ │
│                                │ 2021–now Acme    │   │ Backend engineer           │ │
│  Upload it, check what we      │  - cut p95 40%   │   │ ┌─Projects──────────────┐  │ │
│  read, pick an address.        │ Projects         │   │ │ Invoice parser   py·pg│  │ │
│                                │  invoice parser  │   │ └───────────────────────┘  │ │
│  [Make my portfolio]           └──────────────────┘   └────────────────────────────┘ │
│  Free to build and preview.                         (Night panel; Ink/Paper CV sheet)  │
└────────────────────────────────────────────────────────────────────────────┘
```

Mobile hero (natural height, one column, 16 px gutters, CTA ≥ 48 px, sticky bottom CTA bar with safe-area inset):

```
┌──────────────────────┐
│ LivePortfolio  Sign in│
│ Your CV,             │
│ as a site people     │
│ can open.            │
│ [ Make my portfolio ]│
│ ┌ cv.txt ──────────┐ │
│ │ ADA OKONKWO ...  │ │
│ └──────────────────┘ │
│        ↓             │
│ ┌ ada ▍ ───────────┐ │
│ │ ● Live  Ada ...  │ │
│ └──────────────────┘ │
└──────────────────────┘
```

Account step (one screen; the toggle is the heading):

```
        Make my portfolio                 ← Fraunces
  ( Create account )  Sign in             ← segmented, 44px
  Email     [__________________]
  Password  [______________] [show]   10+ characters
  [ Turnstile ]
  [ Continue ]                          ← Ink button, full width on mobile
  By continuing you agree to the Terms and Privacy Policy.
  Forgot password?  (sign-in mode only)
```

Import step: three plain choices in one column (Upload CV | GitHub username | Paste text) plus a quiet "Start blank" link; below, one honest line on what is sent to AI (copy deck). Review step: two columns on desktop (form left, live preview right), tabs on mobile; max 4 projects. Address step: the prefilled slug inside the address bar visual (`liveportfolio.site/` fixed, slug editable), status line under it.

### 3.5 The hero moment (spec)

Pure CSS keyframes in a server component, **played once on load, ~5 s**, `animation-fill-mode: both`:
1. 0–1.0 s: the `cv.txt` sheet is already on screen (it is the first paint and the LCP-safe content). Name, role, one bullet, one project highlight in Live-tinted marks one after another.
2. 1.0–3.0 s: the highlighted lines lift (`transform`/`opacity` only) and settle into the right-hand site panel as headline, role and a project card.
3. 3.0–4.2 s: the address types into the bar using `steps()` on `width` of a mono text span (`ch` units), then the Lit dot appears with the word "Live".
4. After 4.2 s everything is still. No loop, no scroll-jacking, no JS. `prefers-reduced-motion: reduce` renders the end state immediately. Content is real text (crawlable, readable by screen readers with `aria-hidden` on the decorative duplicate).

Everything else on the page is motionless apart from focus/hover states.

### 3.6 Page story (one scroll, one repeated CTA)

1. **Hero** (the moment) → CTA.
2. **What we read** (quiet, 3 lines with big serif numerals): upload or paste or GitHub; you check it; you choose the address.
3. **Pick a look**: real screenshots of our templates (not CSS mock-ups), 10 listed, Pro ones marked.
4. **Who looked** (only what exists): views, country, referrer per portfolio.
5. **Cost**, currency-free: "Free to build and preview. You pay only to publish." with a link to a pricing page that renders the right currency server-side.
6. **Questions** (6, honest).
7. **Closing** on Night: one line and the same CTA.

### 3.7 Review against generic defaults, and what changes

| Generic default in the current page | Replacement |
|---|---|
| Blue pill CTA with a coloured drop-shadow, "Build My Portfolio →" | Ink rectangle (radius ≤ 8), no shadow, one name everywhere: "Make my portfolio" |
| Uppercase tracked eyebrow labels (HOW IT WORKS, TEMPLATES, FAQ) | Removed; sentence-case serif headings |
| 3 equal cards for "how it works", grey tiles | 3 lines with hairlines and oversized numerals; no containers |
| CSS skeleton mock-ups of templates | Real screenshots |
| Pulsing dot badge in the hero | Gone (the only "live" signal is the one in the moment) |
| Gradient-free but grey-on-white everything | Paper/Ink with one dark Night band |
| "Join N professionals" (renders nothing today) | A real count only if above a floor, from the server |
| Marketing claims that are false (custom domain, 7-day refund, ₦ in FAQ) | Removed (copy deck) |

---

## 4. Layout rules

- **Viewport:** hero and each key section `min-block-size: 100svh` from the `md` breakpoint (≥ 768 px) up; natural height below that. Use `svh`, with a `vh` fallback inside `@supports not (height: 1svh)`.
- **No horizontal scroll from 360 to 1920 px.** Fluid type with `clamp()`, `min-inline-size: 0` on grid/flex children, images `max-inline-size: 100%`. Do not mask bugs with `overflow-x: hidden` on `body`; the e2e test asserts `document.documentElement.scrollWidth <= innerWidth` at every tested width.
- **Touch targets** ≥ 44 × 44 CSS px (buttons, toggles, FAQ summaries, footer links); ≥ 8 px between adjacent targets.
- **Safe areas:** `padding-inline: max(16px, env(safe-area-inset-left))`, same for right; bottom CTA bar uses `padding-block-end: env(safe-area-inset-bottom)`; `viewport-fit=cover` in the viewport meta.
- **Logical properties** throughout (`margin-inline`, `padding-block`, `inset-inline-start`, `text-align: start`, `border-inline-end`), and `dir` on `<html>` from the locale, so RTL needs no layout rewrite. Directional icons flip via `:dir(rtl)`.
- **Motion:** CSS or IntersectionObserver only; every animation behind `@media (prefers-reduced-motion: no-preference)`; transform/opacity only; no animation libraries.
- **Server components for the landing.** Client JS only for: the sign-in/dashboard nav swap (tiny inline script reading the auth key's presence in `localStorage`; **no supabase-js on the landing**), the FAQ (native `<details>`, no JS), and the consent banner.
- **Budgets** (checked in CI, section 8): LCP < 2.5 s on a mid-range phone over 4G (Lighthouse mobile preset, simulated throttling); landing **JS < 150 KB gzipped**. Today's landing is **176 kB First Load JS** (measured with `next build` on `main`; 103 kB of that is the shared React/Next baseline), mainly because `LandingNav`, `PublishedCount`, `PortfolioShowcase`, `PricingSection`, `LocalisedPrice` and `SupportButton` are client components and two pull in supabase-js. Dropping those puts the target at roughly 110–125 kB (estimate; to be measured).
- **Fonts:** self-hosted only. (The Finance template currently `@import`s Google Fonts at runtime, which sends portfolio visitors' IPs to Google; see section 7.)

---

## 5. i18n

**Recommendation: `next-intl` with *no locale in the URL* for app pages** (locale from a cookie, falling back to `Accept-Language`, then `en`). From the next-intl docs (via search results; page not fetched here, *verify the current major version and the Next 15 compatibility note at build time*): an `i18n/request.ts` using `getRequestConfig` can return `{ locale, messages }` computed from a cookie, with no `[locale]` segment and no routing middleware. First-class server-component support keeps the landing free of client JS, and messages are plain JSON (works with any translation workflow). Alternative: Lingui (what Reactive Resume uses): macro/extraction toolchain, more setup; rejected for now.

**Routing constraint (middleware):** `middleware.ts` rewrites every single-segment path on the root domain to `/portfolio/<slug>` unless reserved. So:
- App pages and portfolio URLs stay **unprefixed**. Locale = cookie (`lp_locale`), set by a small language switcher in the footer and account menu; `<html lang dir>` set per request.
- If localised *marketing* pages are wanted later (for SEO), a two-letter prefix is safe: `SLUG_RE` already requires 3–30 characters, so no new slug can equal `fr`, `de`, `pt`, … and `/fr/...` is multi-segment, which the middleware does not rewrite. First check no existing user holds a 1–2 character slug: `select slug from users where length(slug) < 3;`. Do not use 3-letter or region codes as prefixes.
- Add the locale codes in use to `RESERVED_SLUGS` anyway.

**Strings:** all new UI text goes to `messages/en.json` by namespace (`landing`, `auth`, `create`, `address`, `errors`, `preview`). Server routes return **error codes** (they mostly do already) and the client maps codes to translated text; English `message` fields stay as fallback only.

**AI generation takes a target language:** add an optional `language` (BCP-47) to the generate payload and prompt (`lib/prompts.ts`), stored in `portfolios.content.language` (JSON, no schema change) and used for the public page's `<html lang>`. This touches `/api/generate` (protected), so it is a **proposal needing your approval**. Template labels ("About", "Projects", …) also need a small message table per template.

---

## 6. Copy deck (English, plain active voice, sentence case)

Rules: honest claims only (`docs/reference-study.md` §6.4); counts only from our database and only above a floor (for example ≥ 50), otherwise omitted; one CTA name everywhere: **"Make my portfolio"**; never "AI portfolio builder", "website builder" or "portfolio generator" (CLAUDE.md positioning); no currency symbols on the landing.

**Hero**
- Headline: *Your CV, as a site people can open.*
- Subhead: *Upload your CV. Check what we read. Choose your address. Your portfolio is ready to preview in minutes.* (*"minutes": confirm with measured e2e timing before launch.*)
- CTA: **Make my portfolio**
- Under CTA: *Free to build and preview. You pay only to publish.*

**What we read** (three lines)
1. *Bring what you have.* A CV (PDF or Word), a GitHub username, or text you paste. Or start blank.
2. *Check it.* You see everything we read, fix anything, and choose up to four projects to show.
3. *Choose your address.* `liveportfolio.site/your-name`, yours to share.

**Pick a look** — *Ten templates. Preview all of them with your own content before you pay.* (Pro templates marked.)

**Who looked** — *See how many people opened your portfolio, which countries they came from and where they found the link.* (True per `analytics/summary`; check plan gating before saying who gets what.)

**What goes to AI (shown on the import step too)** — *To read your CV and write your portfolio text we send it to OpenAI. We replace emails, phone numbers and links with placeholders where we can, but the rest of the text is sent. See our privacy policy.* (Accurate for import; `/api/generate` still sends email and URLs, so this sentence needs the policy and, ideally, the generate path fixed first.)

**Cost** — *Building and previewing is free. Publishing is paid. See plans.* (links to a page that shows the right currency.)

**Questions (6)**
1. *What do I get?* A portfolio site at your own address, with a preview before you pay.
2. *Is it free?* Building and previewing is free; publishing needs a plan.
3. *What do you do with my CV?* We read it to fill your portfolio. It goes to OpenAI for that. We do not use it to train models. (**Confirm OpenAI API data-use terms for your account before printing the last sentence.**)
4. *Can I delete my account?* Yes, from the dashboard. It deletes your profile, portfolio and uploaded images. (Verify what is not purged: analytics events and `email_subscribers`, per §6.4.)
5. *Can I change my address?* Before you publish, yes. After, contact us (until self-serve change ships).
6. *Can I use my own domain?* Not yet.

**Closing** — *Your work is already good. Show it.* **Make my portfolio**

**Removed on purpose:** custom domain on Pro (not available), "7-day refund" (no refund process exists in code or webhook; add only after a policy exists), "AI-powered", "Join N professionals" unless real, "under 5 minutes", any naira amounts, "tell your story" language, comparisons to Wix/Canva/LinkedIn in the FAQ.

**Multi-currency display: what it needs and the payment constraint (billing not changed)**
- **Price of record per currency:** one Paystack **plan per currency** (the current checkout passes one plan code whose amount is NGN; the modal separately shows a USD number computed from an exchange rate, so the displayed and charged currency can differ: a consumer-protection risk to fix first).
- **Paystack constraint:** a transaction can only be in a currency your Paystack account has enabled (typically NGN, GHS, ZAR, KES, USD, depending on the business country and approval). Enabling USD (or others) is a Paystack account/compliance step; the app cannot create it.
- **Detection:** read the visitor country from Vercel's `x-vercel-ip-country` request header on the server (no extra third-party call, nothing stored), map country to a currency, let the visitor override it, and show **only** currencies we can actually charge.
- **Server-side expected prices** in the webhook (`PAYSTACK_EXPECTED_PRICES`, added on the billing branch) must list every currency/amount pair that exists; display tables and that env must come from one source.
- **Landing stays currency-free**; a `/pricing` server page renders the localised numbers and states the billing period and tax treatment.

---

## 7. Consent (GDPR / ePrivacy and global equivalents)

Tracking and third parties found in the code:

| What | Where | Data | Needs consent? |
|---|---|---|---|
| **Google Analytics 4** (`gtag.js`) | `components/TrackingScripts.tsx`, loaded from the **root layout**, production only, if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set | cookies/device ids, page paths, IP processing by Google | **Yes** (EEA/UK/CH: prior opt-in; also required by many other laws) |
| **Meta Pixel** (`fbevents.js` + noscript `<img>` to facebook.com) | same file, `NEXT_PUBLIC_META_PIXEL_ID` | advertising identifiers, events (`Purchase`, `PageView`) | **Yes**, strictly opt-in. The noscript image fires without any consent mechanism, so it must go or be gated |
| **Visitors of users' portfolios are tracked too** | the root layout also wraps `/portfolio/[slug]` and subdomains | third-party visitors, who have no relationship with us, load GA and Meta | **Serious**: exclude portfolio pages from all third-party trackers (a portfolio is the user's page) |
| **Paystack inline script** (`js.paystack.co`) | `UpgradeModal.tsx`, on demand | payment, fraud signals | Strictly necessary for a payment the user starts; mention in the policy, load only on click |
| **Google Fonts `@import`** | `components/templates/Finance.tsx` (runtime request to `fonts.googleapis.com`) | visitor IP sent to Google | Avoid: self-host with `next/font` like the other templates (German court precedent on IP leakage via Google Fonts) |
| `next/font/google` (Bold, Minimal, others) | build-time download, self-hosted | none at runtime | No |
| **IPinfo Lite** lookup | server, on every portfolio view (`lib/ipinfo.ts`) | visitor IP sent to a third party; hashed IP and company/country stored | Needs a lawful basis (legitimate interest + transparency + opt-out) and a processor agreement; disclose in the policy |
| `analytics_events` (`ip_hash`, referrer, country, company) | our DB | pseudonymous visitor data | Disclose; retention period needed |
| `localStorage`: `lp_referral`, `lp_invite`, `lp_bootcamp`, pricing-region cache | browser | attribution / convenience | Affiliate attribution is **not** strictly necessary → needs consent or must move server-side (first-party cookie set only after consent). Auth token and the draft are strictly necessary |
| `api.qrserver.com` (QR images, per the study) | dashboard | URL sent to a third party | Disclose or generate QR locally |
| **OpenAI** (import/score/generate) | server | CV text; `/api/generate` sends email and URLs | Disclosure + DPA; mind the policy claim in the copy deck |
| Resend (email), Supabase, Vercel, Paystack | server | account/payment data | Sub-processor list in the policy; international-transfer mechanism (SCCs/DPF) |

Requirements for a global audience:
1. A **consent banner** with equal-weight *Accept* and *Reject*, shown before any GA/Meta request, with a persistent "Cookie settings" link; choice stored for 6–12 months. Simplest global rule: **opt-in everywhere** for non-essential tracking (no per-country logic to get wrong).
2. **Google Consent Mode v2** defaults to denied; Meta Pixel loaded only after opt-in (`fbq('consent', ...)`). Either way no pixel on portfolio pages.
3. Remove the Meta noscript tracker (it cannot be consent-gated).
4. Privacy policy and cookie notice rewritten: controller identity, purposes and legal bases, the sub-processor list above, transfers, retention, rights and how to exercise them (deletion exists in the dashboard), what is sent to OpenAI (accurately), what a published portfolio publicly exposes.
5. Data-subject requests: define how `email_subscribers`, `analytics_events` and backups are handled on deletion.
6. Marketing emails (drip): explicit opt-in or a clearly justified existing-customer basis, working unsubscribe (exists), and consent wording at signup (the drip enrolment today is automatic for every signup).
7. Children: state a minimum age.

---

## 8. Test plan

### 8.1 Playwright (planned; added in Phase B)

- Dev dependency `@playwright/test` and a `playwright.config.ts` at the repo root; projects: Chromium for the five viewports, plus WebKit and Firefox for the smoke set; `webServer` runs `next dev -p 3001`.
- **Specs** (`tests/e2e/`):
  1. `landing.spec.ts`: renders, hero moment reaches its end state, CTA goes to `/create/account`, no console errors, **no horizontal overflow at 360, 390, 768, 1366, 1920**, touch-target size check on interactive elements, `prefers-reduced-motion` renders the end state, JSON-LD parses.
  2. `signup.spec.ts`: toggle create/sign in; "already registered" switches to sign in; reuse of an existing session (no second `signUp`); weak password rejected; wrong password message is generic; Turnstile test keys in dev.
  3. `create.spec.ts`: import with **mocked** `/api/import` and `/api/parse-cv` via `page.route` (fixtures from `tests/fixtures`); review edits; address step: invalid shows the format message (never "taken"), reserved, taken with suggestions; generate retry after a mocked 504.
  4. `preview.spec.ts`: preview loads for a seeded portfolio; paywall shows no currency before region resolves.
  5. `a11y.spec.ts`: axe on landing and each step (no serious violations).
- **Screenshots** at 360×640, 390×844, 768×1024, 1366×768 and 1920×1080 of landing and each step into `e2e-screenshots/` (to be added to `.gitignore`; never committed, may contain test data).
- **CI-able subset** (no secrets): everything with mocked network. Anything that talks to Supabase is local/manual only (CI holds no secrets, per `docs/unification-plan.md`).
- **Budget checks:** a script reads `.next` build output and fails if landing First Load JS > 150 kB; Lighthouse CLI (mobile preset, simulated 4G) run manually and in a weekly job for LCP.

### 8.2 `docs/e2e-manual-test.md` (to be written in Phase B; outline)

1. Prerequisites: Node, `npm ci`, a `.env.local` with the real project's `NEXT_PUBLIC_SUPABASE_URL` / anon key / service-role key. **Current state: `.env.local` has `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and nothing is listening there (checked), so local sign-up cannot work today.** The project you gave is `https://fdvrwnftzszlglyscfwk.supabase.co`; I have not written it or any key into a file. Put the URL, anon key and service-role key in `.env.local` yourself (never in chat or git).
2. **Local dev talks to the production project.** Rules: only clearly labelled throwaway accounts (`lp-e2e-<yyyymmdd>-<n>@example.com`, or your own mailbox with plus-addressing, `you+lp-e2e1@gmail.com`, for the one test that must receive a real email); slugs `zz-e2e-<n>`; never touch other rows; never run `scripts/rls-verify.mjs` there.
3. Accounts: `scripts/e2e-accounts.mjs create|cleanup` (Phase B) using the service role: creates users with `email_confirm: true` and `user_metadata.e2e = true` for the tests that do not test the email, and `cleanup` deletes **only** the ids it recorded in a local, gitignored `e2e-accounts.json` (never "all users matching a pattern"). The delete path is the same as the dashboard's (profile + portfolio + storage + auth user). Verify afterwards with a read-only query for `lp-e2e-%` emails.
4. The step list: landing → account (create) → verify (real email, plus-address) → import (a synthetic CV from `bench/synthetic`) → review → address → generate → preview → delete account → confirm nothing remains. Then the failure drills: close the tab after verify, resume; kill the network during generate and retry; sign up with an existing email; reload on each step.
5. OpenAI cost note: each generate is a real call on your key; one per test account; stop at N runs.
6. What to record: timings (for the "minutes" claim), screenshots, any console errors.

### 8.3 Order of work (after your approval)

1. Supabase settings that do not depend on code: Turnstile keys, custom SMTP, redirect allow-list (confirmation stays OFF).
2. `getAccountState` + `/api/account/state`, `/auth/confirm`, new `/create/*` routes behind a flag, check-slug `reason`, authenticated import/parse-cv with the `usage_events` migration (you run it).
3. Landing rebuild (server components, hero moment), consent banner, tracker removal from portfolio pages, welcome-email fix.
4. Playwright suite, budgets in CI, manual test doc.
5. Turn Confirm email ON; send the stranded-signup email; retire the old wizard.

## 9. Decisions needed from you

1. Cookie-only i18n now (recommended) or localised marketing URLs later?
2. Approve the `usage_events` table (migration file only) for per-user limits?
3. Slug change policy: free until publish; one self-serve change with 12-month redirect after (recommended)?
4. May I fix `/api/email/welcome` (auth + escaping) and remove the Meta noscript tracker and trackers on portfolio pages in Phase B?
5. May `/api/generate` get a `language` field and a profile-required error code (protected file)?
6. Do you have a refund policy? If not, the "7-day refund" line stays removed.
7. Confirm whether OpenAI data-use terms on your account allow the "not used to train models" sentence.
8. Which Paystack currencies are enabled on your account?

## 10. Owner decisions recorded after the plan was written

- **Framework:** stay on Next.js (templates and AI tooling are React-first; the landing is already prerendered). No framework switch.
- **Generative UI / AG-UI:** not for the landing or signup (they must be static, fast, accessible, indexable). Possible later for the in-app assistant only, after the operations layer exists, with the agent kept in TypeScript behind `callLLM` and curated components (typed events, fixed catalog, validated props, no raw HTML, http(s)-only links, explicit click for destructive actions). A 1–2 day AG-UI/CopilotKit spike is parked until then. Nothing in Phase B.
- **Grants for real users:** go last, after the signup gate, the RLS migration, the billing checks and the stranded-signups query.
- **Phase B pre-step (only after this plan is approved):** review, then install **Impeccable** at project scope: read its hook script first, pin the version, do not install taste-skill alongside it. Run `/impeccable init` to write `PRODUCT.md` (global audience; English now, i18n-ready; honest claims only; hero = a CV turning into a live portfolio). Use `/impeccable critique` and `audit` as the gate on every page and add its detector run to `npm run verify` if it can run headless. I have not read either skill's contents; its claims (rule counts, licence) are unverified until I read the repo at install time.
