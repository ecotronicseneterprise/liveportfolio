# Runbook: close the browser-write hole (RLS) + JSON-LD escape

Production deploys on **Vercel**: a push to `main` is the deploy. There is **no staging project**; the safety net is a
before-and-after SQL proof on production, a CSV backup, a manual signup test, and a rollback for both code and database.
Nothing in this runbook is automated. Every SQL step is a manual action by the owner.

**What changes:** the browser loses INSERT/UPDATE/DELETE on `users` and `portfolios`. Signup moves to
`POST /api/account/profile`. Edit, generate and delete already go through server routes. Portfolio pages escape JSON-LD.

**Files:** `supabase/manual/20261024120000_close_browser_writes.sql`,
`supabase/rollbacks/20261024120000_close_browser_writes.rollback.sql`.
Separate step: `…120100_revoke_view_count_rpc.sql` and its rollback (run after the main migration).
`scripts/rls-verify.mjs` is an optional extra: it creates throwaway auth users in whichever project you point it at,
so do not run it against production unless you accept that.

**Standing rule for every future migration:** New public tables must enable RLS and revoke anon/authenticated grants in the SAME migration. Supabase grants full anon/authenticated privileges on new public tables by default; that default is what let browsers write users/portfolios. Use: alter table x enable row level security; revoke all on table x from anon, authenticated;

## 0. Before pushing

1. Run the three snapshot queries from the header of the rollback file. Save the output **outside the repo**.
2. If the live policies differ from the five recreated in section 2 of the rollback file (roles, permissive, `USING`/`WITH CHECK`),
   edit that section to match the snapshot, and trim section 1 to the grants the snapshot shows.
3. Export `users` and `portfolios` as CSV from the Supabase dashboard (Table editor → Export). Do **not** create backup
   tables in `public`: new tables get open default grants, which is the bug being fixed.
4. Push to `main`. Vercel builds and deploys.

## 1. After Vercel finishes, before the migration

5. **Signup gate.** Sign up with a throwaway email through the live site. Confirm the `users` row exists with
   `plan = 'unpublished'` and the slug you chose, and that Vercel's function logs show `POST /api/account/profile` 201.
   If signup fails, use **Instant Rollback** in the Vercel dashboard and stop. The database has not been touched yet.
6. **Prove the hole is open** (safe: runs in a transaction and rolls back; uses your own support account):
   ```sql
   begin;
   set local role authenticated;
   select set_config('request.jwt.claims',
     '{"sub":"<YOUR_SUPPORT_USER_ID>","role":"authenticated"}', true);
   update public.users set plan = 'basic' where id = '<YOUR_SUPPORT_USER_ID>';
   rollback;
   ```
   Before the migration it reports `UPDATE 1`. Nothing is saved.

## 2. Migration (quiet time)

7. Run `20261024120000_close_browser_writes.sql` in the Supabase SQL editor.
8. Repeat the proof from step 6. Expected: `ERROR: permission denied for table users`.
   Also try `update public.portfolios set template = template where user_id = '<a real user_id>'` the same way
   (begin / set local role / set_config / rollback). Expected: permission denied.
9. Log in as a normal user. The dashboard must load, an edit must save, and the preview must open.
10. Separate step: run `20261024120100_revoke_view_count_rpc.sql`, then open a public portfolio and confirm its view count
    still increases. It closes a second hole: anyone with the public key could call the `SECURITY DEFINER` function
    and inflate view counts. Its only caller uses the service role.

## 3. How to detect failure

| Signal | Likely cause |
|---|---|
| Users report "Failed to save user profile" at signup | A tab still running the old create page (browser write now blocked). Ask them to reload. If it persists after reload, the new route is failing: check Vercel function logs for `/api/account/profile` |
| `/api/account/profile` returns 401 | Token not sent, or the session has no email |
| `/api/account/profile` returns 5xx | `SUPABASE_SERVICE_ROLE_KEY` missing or wrong in Vercel env; a unique constraint other than slug/email |
| `permission denied for table users/portfolios` in function logs | Some server path writes with the anon/user client. The allow-list test is meant to prevent this; find the route and move it to the service role |
| Dashboard or preview shows empty/blank | SELECT was affected. Re-run the grants query: `anon`/`authenticated` must still hold SELECT and the `*_select_own` policies must exist |
| Paystack webhook, invite or bootcamp redeem errors | Should not change (service role). If they do, roll back the database and investigate |

Watch Vercel's function logs for 30 minutes after the migration and your daily metrics email for signups dropping to zero.

## 4. Recovery

- **Database:** run `supabase/rollbacks/20261024120000_close_browser_writes.rollback.sql` in the SQL editor (this re-opens the
  hole, so it is for outages only), then re-run the snapshot queries and diff against the saved output. Re-apply the
  forward migration as soon as the cause is fixed.
- **Code:** Vercel dashboard → Deployments → previous good deployment → **Instant Rollback**. Order matters: the database
  migration must never run while the *old* code (browser writes) is the live deployment. If you roll the code back after
  the migration, roll the database back first.
- Preview deployments use the same production Supabase, so they are **not** a safe place to test the migration.
