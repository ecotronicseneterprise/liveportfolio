-- ROLLBACK for 20261024120000_close_browser_writes.sql — RE-OPENS the browser-write hole. Use only to recover from an
-- outage caused by the forward migration, and plan to apply the forward migration again as soon as the cause is fixed.
--
-- This file is deliberately NOT inside supabase/migrations/ (and the forward SQL is in supabase/manual/), so nothing applies it automatically.
--
-- STATUS: the five policy definitions (cmd, USING, WITH CHECK) are confirmed against the live pg_policies output.
-- STILL OPEN: the live roles and permissive settings (default: PUBLIC, permissive) and the grants snapshot below.
-- If the snapshot shows a different TO role or RESTRICTIVE, edit section 2 to match before relying on this file.
--
-- ── SNAPSHOT: run these on the target database BEFORE the forward migration and save the output ─────────────────────
-- Compare the grants result with section 1 below. If anon/authenticated hold fewer privileges than listed in section 1,
-- delete the extras from section 1: rolling back must not grant more than the database had before.
--
--   -- policies (paste this output into section 2)
--   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--     from pg_policies
--    where schemaname = 'public' and tablename in ('users', 'portfolios')
--    order by tablename, policyname;
--
--   -- grants held by the browser roles on these two tables
--   select grantee, table_name, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name in ('users', 'portfolios') and grantee in ('anon', 'authenticated')
--    order by table_name, grantee, privilege_type;
--
--   -- is RLS on (it must stay on)
--   select relname, relrowsecurity, relforcerowsecurity from pg_class
--    where oid in ('public.users'::regclass, 'public.portfolios'::regclass);
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- 1. Privileges the forward migration revoked (Supabase's default for public tables). Trim to match the snapshot.
grant insert, update, delete, truncate, references, trigger on table public.users      to anon, authenticated;
grant insert, update, delete, truncate, references, trigger on table public.portfolios to anon, authenticated;

-- 2. The five policies (drop first so this file is re-runnable). REPLACE with the live definitions from the snapshot.
drop policy if exists "users_insert_own"      on public.users;
drop policy if exists "users_update_own"      on public.users;
drop policy if exists "portfolios_insert_own" on public.portfolios;
drop policy if exists "portfolios_update_own" on public.portfolios;
drop policy if exists "portfolios_delete_own" on public.portfolios;

create policy "users_insert_own"      on public.users      for insert with check (auth.uid() = id);
create policy "users_update_own"      on public.users      for update using (auth.uid() = id);
create policy "portfolios_insert_own" on public.portfolios for insert with check (auth.uid() = user_id);
create policy "portfolios_update_own" on public.portfolios for update using (auth.uid() = user_id);
create policy "portfolios_delete_own" on public.portfolios for delete using (auth.uid() = user_id);

commit;
