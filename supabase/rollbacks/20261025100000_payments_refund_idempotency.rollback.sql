-- ROLLBACK for 20261025100000_payments_refund_idempotency.sql.
-- The unique index on ls_order_id is deliberately NOT dropped: it is also declared in lib/schema.sql and the webhook
-- (old and new) depends on it. Dropping refunded_at deletes the refund markers recorded since the migration.
-- Run only after the code that reads refunded_at is no longer live.
begin;
alter table public.payments drop column if exists refunded_at;
commit;
