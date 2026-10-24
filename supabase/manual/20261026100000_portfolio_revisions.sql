-- Portfolio revisions: one row per change to a portfolio, holding the portfolio AS IT WAS BEFORE that change, so any change can be
-- undone. Written only by the server (lib/portfolio/commit.ts: /api/update, /api/revisions, later the assistant's tools).
-- RUN BY HAND in the Supabase SQL editor; never applied automatically (see manual/README.md).
-- Until this exists, editing still works; the dashboard just shows no history and the code logs once.
--
-- NEW TABLE RULE (docs/deploy-runbook-rls.md): RLS is enabled and the browser roles lose every privilege in the SAME migration.
-- No policies: only the service role (server routes) reads or writes this table. A browser can never read someone's old content.
--
-- Retention: the app keeps the newest 50 revisions per portfolio (lib/portfolio/commit.ts) and deletes the rest after each save.
-- Content only (no files): project and profile images are separate storage objects and are not restored by an undo, only the links to them.
--
-- Rollback: supabase/rollbacks/20261026100000_portfolio_revisions.rollback.sql

begin;

create table if not exists public.portfolio_revisions (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  content      jsonb not null,
  template     text,
  summary      jsonb not null default '[]'::jsonb,
  source       text not null check (source in ('dashboard', 'assistant', 'restore')),
  created_at   timestamptz not null default now()
);

create index if not exists portfolio_revisions_portfolio_created_idx on public.portfolio_revisions (portfolio_id, created_at desc);
create index if not exists portfolio_revisions_user_idx on public.portfolio_revisions (user_id);

alter table public.portfolio_revisions enable row level security;
-- deliberately NO policies: nothing but the service role may touch this table

revoke all on table public.portfolio_revisions from anon, authenticated;
grant select, insert, delete on table public.portfolio_revisions to service_role;

commit;

-- Verify (expect: relrowsecurity = true; no grants for anon/authenticated; zero policies):
--   select relrowsecurity from pg_class where oid = 'public.portfolio_revisions'::regclass;
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'portfolio_revisions' order by 1, 2;
--   select count(*) from pg_policies where tablename = 'portfolio_revisions';
