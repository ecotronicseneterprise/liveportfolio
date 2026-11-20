# Turning on Google sign-up and sign-in

Written for the owner. The code is finished and already on production; Google sign-in is OFF only because nothing has been configured.
Turning it on is three dashboards and one switch. Allow about 45 minutes, most of it the Google consent screen.

What people will see: a "Continue with Google" button under the form on `/create/account` (sign up) and on `/login` (sign in).

## Before you start (5 minutes)

1. **Check "Confirm email" is ON in Supabase.** This is the one safety requirement.
   Supabase dashboard → your project → Authentication → Sign In / Providers → **Email** → "Confirm email" must be ON.
   Why it matters: Supabase can join a Google sign-in to an existing account with the same email. If an unverified password sign-up
   exists for someone's address, the real owner signing in with Google could end up sharing an account with the person who
   registered it first. With Confirm email ON that cannot happen. (Your sign-up already asks for an emailed code, which is a good sign it is on. Check anyway.)
2. Have these ready: the Google account you want to own the app (use a company address, not a personal one you may lose),
   your Supabase project, your Vercel project (`liveportfolio`).
3. Do not do this on a day you cannot spend 15 minutes testing afterwards.

## Part 1: Supabase, the three values you will need

Open Authentication → **URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://liveportfolio.site` |
| Redirect URLs (add each) | `https://liveportfolio.site/**` |
| | `http://localhost:3101/**` (only if you test locally; this project uses port 3101, never 3000) |
| | the Vercel preview address, only if you test there (for example `https://liveportfolio-git-dev-cliffords-projects-0027534f.vercel.app/**`; copy the real one from Vercel → Deployments) |

The `/**` covers `/auth/return`, which is where Google sends people back. If this list is wrong, people come back signed out.

Then Authentication → Sign In / Providers → **Google**. Leave it for now, but **copy the "Callback URL (for OAuth)"** shown there.
It looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`. Copy it, do not type it.

## Part 2: Google Cloud Console

Go to console.cloud.google.com, create a project called `LivePortfolio` (or choose an existing one).
Google has renamed this area; it is "APIs & Services → OAuth consent screen" in older consoles and **Google Auth Platform**
in newer ones (with Branding, Audience, Data Access and Clients). The settings are the same.

1. **Branding / consent screen**
   - User type: **External**.
   - App name: `LivePortfolio`. User support email: your support address. Developer contact email: the same.
   - App logo: your logo (`public/logo-512.png`). Optional, but it makes the consent screen look trustworthy.
   - **Authorized domains:** `liveportfolio.site` and `supabase.co`.
   - App home page: `https://liveportfolio.site`. Privacy policy: `https://liveportfolio.site/privacy`. Terms: `https://liveportfolio.site/terms`.
     (Both pages exist and our privacy page already says that, if you sign in with Google, we receive your name and email.)
2. **Data access / scopes.** Add only: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   These are non-sensitive, so Google does not need to review the app.
3. **Audience / publishing status: set it to "In production" (Publish app).**
   While it says "Testing", only the test users you list (up to 100) can sign in, and consent lapses after 7 days. This is the
   most common cause of "it works for me but nobody else can sign in". For non-sensitive scopes, publishing is immediate.
4. **Clients → Create client → Application type: Web application.**
   - Name: `LivePortfolio web`.
   - **Authorized JavaScript origins:** `https://liveportfolio.site`
   - **Authorized redirect URIs:** the Supabase callback URL you copied in Part 1, exactly.
   - Create it, then copy the **Client ID** and **Client secret**. Treat the secret like a password; never put it in the code or in chat.

## Part 3: Supabase, switch Google on

Authentication → Sign In / Providers → **Google**:
- Enable it. Paste the Client ID and Client secret. Save.
- Leave "Skip nonce checks" OFF. Leave "Allow users without an email" OFF.
- Keep "Allow anonymous sign-ins" OFF.

## Part 4: Vercel, the switch

Vercel → liveportfolio → Settings → Environment Variables → add:

```
NEXT_PUBLIC_SOCIAL_PROVIDERS = google
```

Scope: **Production** (add **Preview** too if you want to try it on the `dev` preview first).

This value is baked into the page when it is built, so it only takes effect after a new build:
Deployments → the latest production deployment → ⋯ → **Redeploy** (untick "Use existing build cache").

Confirm it is live: open `https://liveportfolio.site/api/flags`. It should now show `"social":true`.

Do not set `NEXT_PUBLIC_SOCIAL_PROVIDERS` to anything except providers you have set up. Today only `google` is wired in dashboards.
(GitHub, LinkedIn and "email me a code" exist in the code but are untested here; the sign-in page shows only Google buttons anyway.)

## Part 5: Test it (15 minutes, with a throwaway Gmail account, in a private window)

1. **Sign up:** `https://liveportfolio.site/create/account` → "Continue with Google" → choose the throwaway account → consent.
   Expected: you land on the address step with an address suggested from your Google name. Pick one, continue, import, review.
2. **Sign out, then sign in:** `https://liveportfolio.site/login` → "Continue with Google". Expected: straight to your dashboard, not back to the address step.
3. **Cancel on Google's screen.** Expected: a clear "try again" message, not a blank page.
4. **Phone:** repeat step 1 on your phone. The button should be easy to tap and nothing should scroll sideways.
5. **Safety check:** register another throwaway address with a password but do not verify it, then try Google with the same address.
   Expected: you do NOT end up inside the unverified account. (If you can, write down what actually happens.)
6. **Delete the throwaway accounts** afterwards (Supabase → Authentication → Users, or the delete-account button).

What the app does after Google returns: it reads only your **name** (to suggest an address and fill the review form).
It does not use your Google picture or any other field.

## Rolling back (about two minutes)

Delete `NEXT_PUBLIC_SOCIAL_PROVIDERS` (or set it empty) in Vercel and redeploy. The buttons disappear. People who already created
accounts with Google keep them; until you switch it back on they sign in with the password reset ("Forgot password") on their email address.

## What to expect and what to watch

- **The consent screen shows your Supabase address** (something like `abcd1234.supabase.co`) next to the app name until Google
  has verified your branding or you use a Supabase custom domain (a paid Supabase option). It is normal. Verify branding later if
  it hurts sign-ups.
- **Watch the funnel:** in Google Analytics, compare completed sign-ups for the week before and the week after.
  Google sign-in mainly helps phones, where typing a password is the biggest drop-off.
- **Existing customers:** someone who signed up with a password and later uses Google with the same (verified) email lands in
  the same account. That is intended.
- **Support:** if a person says "Google says this app is not verified" or "access blocked", the consent screen is still in Testing
  (Part 2, step 3).

## Troubleshooting

| What you see | Most likely cause |
|---|---|
| Google error `redirect_uri_mismatch` | the redirect URI in Google differs from Supabase's callback by even one character (Part 2 step 4) |
| Back on `/create/account`, signed out | the site address is missing from Supabase's Redirect URLs (Part 1) |
| "Unsupported provider" | Google is not enabled in Supabase (Part 3) |
| Works for you, not for others | the consent screen is still "Testing" (Part 2 step 3) |
| No button on the page | `NEXT_PUBLIC_SOCIAL_PROVIDERS` is unset, or the site was not redeployed after you set it (Part 4) |
| Button is there but nothing happens | open the browser console; a message about the provider not being enabled means Part 3 is incomplete |

## Reference

- Code: `lib/onboarding/social.ts`, `components/onboarding/SocialSignIn.tsx` (look: `appearance` "flow" for sign-up, "plain" for `/login`),
  `components/onboarding/OAuthReturn.tsx`, `app/auth/return/page.tsx`.
- The longer, multi-provider setup notes are in `docs/social-signin-setup.md`.
