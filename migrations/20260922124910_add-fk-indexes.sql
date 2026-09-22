-- Fix advisor missing-fk-index warnings: FK columns without indexes force
-- full scans + heavier locks on referenced-row delete/update.
-- Plain CREATE INDEX (not CONCURRENTLY): migrations run in a transaction
-- where CONCURRENTLY is disallowed, and tables are small.

create index if not exists tickets_category_idx on public.tickets (category_id);
create index if not exists role_invites_invited_by_idx on public.role_invites (invited_by);
create index if not exists messages_author_idx on public.messages (author_id);
