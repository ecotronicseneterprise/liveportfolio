-- ROLLBACK for 20261024120100_revoke_view_count_rpc.sql (re-allows anyone to call increment_view_count).
begin;
grant execute on function public.increment_view_count(uuid) to public, anon, authenticated, service_role;
commit;
