-- OPTIONAL, separate from the main fix. Run it after 20261024120000_close_browser_writes.sql if you agree.
--
-- public.increment_view_count(portfolio_id uuid) is SECURITY DEFINER (it runs with the owner's rights, bypassing RLS)
-- and Postgres grants EXECUTE to PUBLIC by default, so anyone — even without logging in — can call it through the
-- PostgREST RPC endpoint with the public anon key and inflate any portfolio's view_count.
--
-- Its only caller in this codebase is server-side with the service role (app/portfolio/[slug]/page.tsx,
-- supabaseAdmin.rpc('increment_view_count', …)), which keeps working. Nothing in the browser calls it.
--
-- Rollback: supabase/rollbacks/20261024120100_revoke_view_count_rpc.rollback.sql

begin;
revoke execute on function public.increment_view_count(uuid) from public, anon, authenticated;
grant  execute on function public.increment_view_count(uuid) to service_role;
commit;
