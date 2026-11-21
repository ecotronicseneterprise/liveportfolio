begin;
drop table if exists public.mcp_uploads;
drop table if exists public.mcp_proposals;
drop table if exists public.mcp_connections;
delete from public.usage_events where kind in ('mcp_call', 'mcp_write', 'mcp_image');
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check check (kind in ('parse_cv', 'import', 'score'));
commit;
