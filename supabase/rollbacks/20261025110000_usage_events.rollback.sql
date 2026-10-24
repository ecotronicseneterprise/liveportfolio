-- ROLLBACK for 20261025110000_usage_events.sql. Drops the table and the counters in it (they are disposable).
-- The code falls back to the in-process limiter when the table is missing, so rolling back is safe at any time.
begin;
drop table if exists public.usage_events;
commit;
