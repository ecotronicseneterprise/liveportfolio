-- LivePortfolio MCP: connections (one row per user + assistant app), change proposals awaiting the person's approval,
-- and one-time picture-upload links. RUN BY HAND in the Supabase SQL editor (see manual/README.md).
-- NEW TABLE RULE: RLS on and browser roles lose every privilege in the SAME migration. Only the service role touches these.
-- Rollback: supabase/rollbacks/20261121100000_mcp.rollback.sql
begin;

create table if not exists public.mcp_connections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  client_id    text not null,
  client_name  text not null default '',
  allow_edits  boolean not null default true,
  share_contact boolean not null default false,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  unique (user_id, client_id)
);
create index if not exists mcp_connections_user_idx on public.mcp_connections (user_id);

create table if not exists public.mcp_proposals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  connection_id  uuid references public.mcp_connections (id) on delete set null,
  ops            jsonb not null,
  summary        jsonb not null default '[]'::jsonb,
  base_edit_count integer,
  status         text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '30 minutes')
);
create index if not exists mcp_proposals_user_idx on public.mcp_proposals (user_id, status);

create table if not exists public.mcp_uploads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  token_hash  text not null unique,
  target      text not null,
  status      text not null default 'waiting' check (status in ('waiting', 'done')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '10 minutes')
);
create index if not exists mcp_uploads_user_idx on public.mcp_uploads (user_id);

alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check
  check (kind in ('parse_cv', 'import', 'score', 'mcp_call', 'mcp_write', 'mcp_image'));

alter table public.mcp_connections enable row level security;
alter table public.mcp_proposals  enable row level security;
alter table public.mcp_uploads    enable row level security;
revoke all on table public.mcp_connections from anon, authenticated;
revoke all on table public.mcp_proposals  from anon, authenticated;
revoke all on table public.mcp_uploads    from anon, authenticated;
grant select, insert, update, delete on table public.mcp_connections to service_role;
grant select, insert, update, delete on table public.mcp_proposals  to service_role;
grant select, insert, update, delete on table public.mcp_uploads    to service_role;

commit;

-- Verify (expect three rows with relrowsecurity = true):
--   select relname, relrowsecurity from pg_class where relname in ('mcp_connections','mcp_proposals','mcp_uploads');
