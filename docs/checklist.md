Interactive checklist — tick each item as you complete it. Progress saves in your browser so if you close and come back it remembers where you were.

**8 sections, 66 items total:**

1. **Supabase** — 10 items. The most important section. Run schema.sql, confirm RLS is ON on all 4 tables, create both storage buckets, enable Google + Email auth.

2. **OpenAI** — 3 items. Get key, confirm GPT-4o-mini access, add $5 credit.

3. **Lemon Squeezy** — 6 items. Create both products ($9 and $19), set up the webhook pointing to `/api/webhook`, copy the signing secret.

4. **Resend** — 5 items. Verify `liveportfolio.site` domain, set FROM address correctly.

5. **Codebase** — 10 items. Middleware at root, both templates exist, 1-per-account check in generate route, HMAC in webhook.

6. **.env.local** — 10 items. Every variable present, no empty values.

7. **VPS Build** — 8 items. npm install → build → PM2 start → confirm port 3001 responding.

8. **Live Testing** — 12 items. Full flow from landing page to published portfolio at `slug.liveportfolio.site`.

**Don't skip the Supabase RLS step** — if RLS is off, any user can read every other user's data. It's the most commonly missed step.