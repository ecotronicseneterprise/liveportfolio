-- ROLLBACK for 20261026100000_portfolio_revisions.sql. Drops the table and all saved history (portfolios themselves are untouched).
-- The code keeps editing when the table is missing (history and undo simply stop), so rolling back is safe at any time.
begin;
drop table if exists public.portfolio_revisions;
commit;
