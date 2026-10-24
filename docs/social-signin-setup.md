# Social and passwordless sign-in: setup

The code is on `dev` and **does nothing until you do the steps below**. Buttons render only for the providers listed in
`NEXT_PUBLIC_SOCIAL_PROVIDERS` (empty by default). I enabled nothing in Supabase, Google, GitHub or LinkedIn.
Where a Supabase or provider dashboard detail below is marked *verify*, check it against that product's current docs while
you set it up; I could not open those pages from here.

## 0. Order matters

1. Ship the new flow (it is already on `dev`; flag `NEXT_PUBLIC_ONBOARDING_V2`).
2. **Turn "Confirm email" ON in Supabase** (Authentication → Providers → Email), with custom SMTP and Turnstile set up first
   (see `docs/onboarding-plan.md` section 1.7).
3. Only then configure a provider, then list it in `NEXT_PUBLIC_SOCIAL_PROVIDERS`.

**Why Confirm email must be ON first.** Supabase can link an OAuth identity to an existing account that has the same e-mail
address (*verify the exact linking rules in the current Supabase docs*). If someone had registered `victim@example.com` with a
password and never verified it, the real owner signing in with Google could end up sharing an account with the person who
squatted the address. With Confirm email ON, an unverified password sign-up has no usable session and cannot be left behind
that way. Never enable a provider while Confirm email is OFF.

## 1. Supabase (once, for all providers)

Authentication → URL Configuration:
- **Site URL:** `https://liveportfolio.site`
- **Redirect URLs (allow-list):** `https://liveportfolio.site/**` (this covers `/auth/return` and `/auth/confirm`) and
  `http://localhost:3001/**` for local dev. Add a Vercel preview pattern only if you test sign-in on previews, and then a
  specific one, not `*`.

The **callback URL every provider needs** is shown on each provider's page in Supabase and has this shape:
`https://<your-project-ref>.supabase.co/auth/v1/callback`. Copy it from the dashboard rather than typing it.

Authentication → Providers: enable **Google**, **GitHub** and **LinkedIn (OIDC)** one at a time, pasting the client ID and
secret from the sections below. Keep **Allow anonymous sign-ins** OFF.

## 2. Google

Google Cloud Console → APIs & Services:
1. **OAuth consent screen** (External): app name, support e-mail, app logo (optional), **Authorized domains:**
   `liveportfolio.site` and `supabase.co`, **Privacy policy URL** and **Terms URL** on `liveportfolio.site` (both must exist
   and say accurately what you collect), developer contact e-mail.
2. **Scopes:** `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` only (these are non-sensitive, so no Google
   verification review is needed).
3. **Publishing status: set it to "In production".** While it says *Testing*, only the test users you list (max 100) can sign
   in, and consent expires after 7 days. This is the most common reason "it works for me but not for users".
4. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorized JavaScript origins: `https://liveportfolio.site`.
   Authorized redirect URIs: the Supabase callback URL from section 1.
5. Paste the client ID and secret into Supabase → Providers → Google.

## 3. GitHub

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:
- Homepage URL: `https://liveportfolio.site`
- **Authorization callback URL:** the Supabase callback URL from section 1
- Generate a client secret, paste ID and secret into Supabase → Providers → GitHub.
- The sign-in uses GitHub's login (`user_name`) only to **suggest** the username on the import step, and only after it matches
  GitHub's login rules (letters, digits, single hyphens, max 39). Anyone can change it before importing. The import itself
  still reads only public data through the app's own token.
- People who hide their e-mail on GitHub may arrive without a verified e-mail; the flow then treats them as unverified
  (*verify how Supabase reports this for GitHub*).

## 4. LinkedIn (OpenID Connect)

LinkedIn Developers → Create app (it must be associated with a LinkedIn Page you manage):
- Products tab: add **"Sign In with LinkedIn using OpenID Connect"** (the older "Sign In with LinkedIn" product is a
  different, deprecated one).
- Auth tab: add the Supabase callback URL as an **Authorized redirect URL**.
- Paste client ID and secret into Supabase → Providers → **LinkedIn (OIDC)** (the provider id in code is `linkedin_oidc`).
- LinkedIn returns **name and e-mail only**: not the profile, the headline or the CV. The app uses the name to suggest an
  address and review field. It does not read the picture.

## 5. "Email me a code"

Authentication → Email Templates → **Magic Link** (the template used for e-mail sign-in codes) and **Confirm signup**: include
the 6-digit `{{ .Token }}` prominently (the app asks for the code in the same box; the link is a fallback to `/auth/confirm`).
Keep OTP expiry at 10 minutes or less. Turnstile applies to code requests as well as passwords, so enforce it only after the
old wizard is retired (its sign-up has no widget).

## 6. Turn it on

In Vercel → Settings → Environment Variables (the value is baked in at **build time**, so redeploy after changing it):

```
NEXT_PUBLIC_SOCIAL_PROVIDERS=google,github,linkedin_oidc,email_otp
```

List only what you configured. Scope it to **Preview** first, test, then add it to Production. Unknown names are ignored.
Required companion setting: `NEXT_PUBLIC_ONBOARDING_V2=true` (the social buttons also appear on `/login`, which works without
it, but a first-time social user needs the new address step to finish signing up).

## 7. What happens after a social sign-in

1. The provider sends the browser to `/auth/return?next=...`; supabase-js reads the session from the URL.
2. `getAccountState` finds no `users` row, so the person lands on **/create/address** with the address suggested from the
   provider name (always a valid slug; format and reserved words are re-checked in the browser and on the server).
3. They choose an address (creates the row through `POST /api/account/profile`), then import (GitHub username prefilled for a
   GitHub sign-in), review, generate.
4. The avatar and the provider's e-mail are never imported. The account e-mail is the one Supabase verified.

## 8. Test checklist (throwaway accounts on the preview deployment; it uses the production database)

- [ ] Google: new account → lands on the address step with a prefilled address → finish → preview. Delete the account.
- [ ] Google: sign in again → goes to the dashboard (or the preview), not back to the address step.
- [ ] GitHub: the import username is prefilled, valid, editable.
- [ ] LinkedIn: name prefilled.
- [ ] Email code: new address and existing address both work; a wrong code shows "wrong or has expired".
- [ ] Linking: with Confirm email ON, register an address by password **without** verifying, then sign in with Google on the
      same address. Expected: no shared access to the unverified password account (*check what Supabase actually does here and
      write the result below*).
- [ ] `/auth/return?next=https://evil.example` and `?next=//evil.example` land on `/create/account`, not off-site.
- [ ] A provider error (cancel on the consent screen) shows the retry message, not a blank page.

Result of the linking check: ______

## 9. Not included, on purpose

Apple (only needed if you ship an iOS app), Facebook, X. Adding another provider later is two lines in
`lib/onboarding/social.ts` plus its setup section here.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `redirect_uri_mismatch` (Google) | the callback URL in the provider differs from Supabase's, character for character |
| "Unsupported provider" | the provider is not enabled in Supabase, or the id is wrong (`linkedin_oidc`, not `linkedin`) |
| Back at `/create/account` signed out | the redirect URL is not in Supabase's allow-list, so the session was dropped |
| Works for you, not for others (Google) | consent screen still in *Testing* |
| Buttons do not appear | `NEXT_PUBLIC_SOCIAL_PROVIDERS` unset or not redeployed (it is a build-time value) |
