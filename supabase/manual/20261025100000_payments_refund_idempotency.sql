-- Billing webhook hardening. RUN BY HAND in the Supabase SQL editor; never applied automatically (see manual/README.md).
-- Run it BEFORE the webhook code that needs it is deployed (refund handling reads/writes payments.refunded_at; until the
-- column exists, a refund event answers 500 and Paystack retries it, which is harmless but noisy).
--
-- 1. Idempotency: the webhook claims a payment by INSERTing its Paystack reference first and treats a unique violation as
--    "already processed". That only works if payments.ls_order_id is UNIQUE in the live database. lib/schema.sql says it is;
--    confirm, and check for existing duplicates BEFORE creating anything:
--
--      select ls_order_id, count(*) from public.payments group by 1 having count(*) > 1;      -- expect 0 rows
--      select indexname, indexdef from pg_indexes
--       where schemaname = 'public' and tablename = 'payments' and indexdef ilike '%unique%';  -- expect one on (ls_order_id)
--
--    If the first query returns rows, STOP: resolve the duplicates by hand first (the index creation below would fail).
--
-- 2. Refunds: a nullable timestamp marking a payment as refunded. Additive; existing rows are untouched.
--
-- Rollback: supabase/rollbacks/20261025100000_payments_refund_idempotency.rollback.sql

begin;

create unique index if not exists payments_ls_order_id_key on public.payments (ls_order_id);

alter table public.payments add column if not exists refunded_at timestamptz;

commit;

-- Optional hardening, separate decision (not run by this file): `payments` has RLS on and only a SELECT policy, so the
-- browser cannot write it today. The users/portfolios incident shows grants are the stronger guard:
--   revoke insert, update, delete, truncate, references, trigger on table public.payments from anon, authenticated;
--   revoke insert, update, delete, truncate, references, trigger on table public.subscriptions from anon, authenticated;
-- Both tables are written only by service-role routes (paystack-webhook, cron/expire-plans).
