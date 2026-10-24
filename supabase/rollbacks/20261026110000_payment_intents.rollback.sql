-- ROLLBACK for 20261026110000_payment_intents.sql. Drops the intents table (checkout attempts and their status).
-- Payments, subscriptions and users are untouched. With the table gone, /api/checkout answers 503 (nobody can start a payment) and the webhook
-- keeps handling the old plan-code payments. Roll the code back first (Instant Rollback) if you do not want customers to see that message.
begin;
drop table if exists public.payment_intents;
commit;
