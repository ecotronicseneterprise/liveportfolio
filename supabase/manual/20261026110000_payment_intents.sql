-- Payment intents: one row per one-time checkout we start (POST /api/checkout, behind CHECKOUT_V2). The server writes the row BEFORE
-- calling Paystack, with the price and tier it chose; the webhook and the return page trust ONLY references found here.
-- RUN BY HAND in the Supabase SQL editor; never applied automatically (see manual/README.md).
-- Until this exists nothing breaks: /api/checkout answers 503, the webhook falls back to the plan-code path, and CHECKOUT_V2 is off by default.
--
-- NEW TABLE RULE (docs/deploy-runbook-rls.md): RLS is enabled and the browser roles lose every privilege in the SAME migration.
-- No policies: only the service role (server routes) reads or writes this table.
--
-- granted_expires_at: the plan's new end date, decided once when the grant starts, so a retry after a partial failure re-applies the same
-- date instead of adding another year. followup_sent_at: reserved for the one abandoned-checkout e-mail (design only, not built yet).
--
-- Rollback: supabase/rollbacks/20261026110000_payment_intents.rollback.sql

begin;

create table if not exists public.payment_intents (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  tier               text not null check (tier in ('basic', 'pro', 'test')),
  amount_kobo        integer not null check (amount_kobo > 0),
  currency           text not null default 'NGN' check (currency = 'NGN'),
  reference          text not null unique,
  status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled')),
  access_code        text,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '24 hours'),
  paid_at            timestamptz,
  granted_expires_at timestamptz,
  followup_sent_at   timestamptz
);

create index if not exists payment_intents_user_created_idx on public.payment_intents (user_id, created_at desc);

alter table public.payment_intents enable row level security;
-- deliberately NO policies: nothing but the service role may touch this table

revoke all on table public.payment_intents from anon, authenticated;
grant select, insert, update, delete on table public.payment_intents to service_role;

commit;

-- Verify (expect: relrowsecurity = true; grants only for service_role; zero policies):
--   select relrowsecurity from pg_class where oid = 'public.payment_intents'::regclass;
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'payment_intents' order by 1, 2;
--   select count(*) from pg_policies where tablename = 'payment_intents';
