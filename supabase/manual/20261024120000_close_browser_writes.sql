-- Close the browser-write hole on public.users and public.portfolios.
--
-- WHY: the five write policies below let ANY signed-in user write ANY column of their own row straight from the
-- browser with the public anon key — plan, plan_expires_at, published_at, slug, content, template. That bypasses
-- every API check (payment, plan gating, validation).
--
-- AFTER THIS MIGRATION: the browser can only READ (the *_select_own policies stay). Every write goes through a
-- server route that authenticates the token and writes with the service role (which bypasses RLS and these grants):
--   signup row      POST /api/account/profile
--   edit / template PATCH /api/update
--   generate        POST /api/generate
--   delete          POST /api/delete-account
--
-- RUN ORDER (important):
--   1. Deploy the code that contains POST /api/account/profile and the updated app/create/page.tsx (Vercel, push to main).
--   2. Sign up with a throwaway email on the live site and confirm it works (docs/deploy-runbook-rls.md, step 5).
--   3. Run THIS file by hand in the SQL editor, ideally when nobody is mid-signup (a browser still running the OLD
--      create page would get "Failed to save user profile" and must reload). Then repeat the SQL proof from the runbook.
--   4. Rollback: supabase/rollbacks/20261024120000_close_browser_writes.rollback.sql
--   This file lives in supabase/manual/ on purpose: it is never applied automatically.
--
-- BEFORE running, capture the live state so the rollback can restore it exactly (schema.sql may not match prod):
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--     from pg_policies where tablename in ('users','portfolios') order by tablename, policyname;
--   select grantee, table_name, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name in ('users','portfolios') and grantee in ('anon','authenticated')
--     order by 2,1,3;

begin;

-- 1. The five write policies named in the incident report. IF EXISTS: safe if one was already removed.
drop policy if exists "users_insert_own"      on public.users;
drop policy if exists "users_update_own"      on public.users;
drop policy if exists "portfolios_insert_own" on public.portfolios;
drop policy if exists "portfolios_update_own" on public.portfolios;
drop policy if exists "portfolios_delete_own" on public.portfolios;

-- 2. Belt and braces: even if some other write policy exists (or is added later by mistake), the browser roles
--    have no privilege to write. TRUNCATE/REFERENCES/TRIGGER are not covered by RLS at all, so revoke those too.
--    SELECT is left alone: the dashboard, preview polling and PublishedCount read these tables with the user's JWT.
revoke insert, update, delete, truncate, references, trigger on table public.users      from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.portfolios  from anon, authenticated;

-- 3. Make sure the server side keeps full access (it already has it by default; stated so the intent is explicit).
grant select, insert, update, delete on table public.users      to service_role;
grant select, insert, update, delete on table public.portfolios to service_role;

commit;

-- Verify (expect: only *_select_own style SELECT policies remain; no INSERT/UPDATE/DELETE grants for anon/authenticated):
--   select tablename, policyname, cmd from pg_policies where tablename in ('users','portfolios') order by 1,2;
--   select grantee, table_name, privilege_type from information_schema.role_table_grants
--     where table_schema='public' and table_name in ('users','portfolios') and grantee in ('anon','authenticated');
