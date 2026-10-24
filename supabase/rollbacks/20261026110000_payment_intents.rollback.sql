-- ROLLBACK for 20261026110000_payment_intents.sql. Drops the intents table (checkout attempts and their status).
-- Payments, subscriptions and users are untouched. With the table gone, /api/checkout answers 503 and the webhook uses the plan-code path,
-- so rolling back is safe at any time (turn CHECKOUT_V2 off first so the modal does not offer the new checkout).
begin;
drop table if exists public.payment_intents;
commit;
