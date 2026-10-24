-- Per-user usage counters for the LLM-backed import routes (/api/import, /api/parse-cv) in the new onboarding flow.
-- RUN BY HAND in the Supabase SQL editor; never applied automatically (see manual/README.md).
-- Until this exists the code falls back to a per-instance in-memory limiter (weaker on Vercel) and logs once.
--
-- NEW TABLE RULE (docs/deploy-runbook-rls.md): RLS is enabled and the browser roles lose every privilege in the SAME
-- migration. Supabase grants anon/authenticated full access to new public tables by default; with no policies RLS
-- already denies them, and the revoke removes the grants themselves. Only the service role (server routes) reads/writes.
--
-- Retention: the app deletes rows older than 7 days on ~2% of calls (lib/usage.ts). Longest limit window is 1 day.
-- Optional scheduled purge instead (needs the pg_cron extension, your call):
--   select cron.schedule('usage_events_purge', '17 3 * * *', $$delete from public.usage_events where at < now() - interval '7 days'$$);
--
-- Rollback: supabase/rollbacks/20261025110000_usage_events.rollback.sql

begin;

create table if not exists public.usage_events (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind    text not null check (kind in ('parse_cv', 'import', 'score')),
  at      timestamptz not null default now()
);

create index if not exists usage_events_user_kind_at_idx on public.usage_events (user_id, kind, at desc);
create index if not exists usage_events_at_idx on public.usage_events (at);

alter table public.usage_events enable row level security;
-- deliberately NO policies: nothing but the service role may touch this table

revoke all on table public.usage_events from anon, authenticated;
grant select, insert, delete on table public.usage_events to service_role;

commit;

-- Verify (expect: relrowsecurity = true; no grants for anon/authenticated; zero policies):
--   select relrowsecurity from pg_class where oid = 'public.usage_events'::regclass;
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'usage_events' order by 1, 2;
--   select count(*) from pg_policies where tablename = 'usage_events';
