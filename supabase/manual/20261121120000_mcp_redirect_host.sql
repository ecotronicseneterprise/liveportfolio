-- Optional: remember the verified sign-in return host of each assistant app, so the approval page can offer "Open Claude" / "Open ChatGPT".
-- RUN BY HAND. The code works without it (the button just does not appear). Rollback: supabase/rollbacks/20261121120000_mcp_redirect_host.rollback.sql
alter table public.mcp_connections add column if not exists redirect_host text;
