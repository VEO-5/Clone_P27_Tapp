-- Pearl27 Modern RLS — Phase 1: user-scoped READS (+ own-ticket INSERT).
-- Lead lock 2026-10-06. Run AFTER all 2026092* migrations in Supabase SQL editor.
-- Safe to re-run: every statement is idempotent (DROP POLICY IF EXISTS).
--
-- MODEL: targets the live v1 schema (migrations/20260921103608_ticketing-v1.sql:
-- profiles 1:1 auth.users, tickets.requester_id/assignee_id/version, messages,
-- attachments w/ storage_key `tickets/{ticket_id}/...`, known_issues, categories,
-- canned_responses, app_settings, role_invites). NOT the stale simplified
-- supabase/schema.sql (email-identity, no profiles) — that file documents the
-- original scaffold and must be reconciled separately.
--
-- PHASE 1 SCOPE: SELECT for authenticated + INSERT own tickets only.
-- All mutations stay on the server functions (service-role bypasses RLS) until
-- Phase 2 opens direct writes. anon gets NOTHING (no anon policies = deny).
-- role_invites stays server-only (claim runs at login; invite emails must not leak).
-- Storage bucket stays PRIVATE; reads via serverFn createSignedUrl(60) today,
-- direct storage SELECT policy included for the future direct-read path.
-- Helpers public.is_desk_user()/is_admin_user() already hardened + granted to
-- authenticated (migrations/20260922123115) — reused below, no changes needed.

-- ---------------------------------------------------------------------------
-- 0. Status superset: allow 'closed' (contracts TicketStatus lock 2026-10-06)
-- ---------------------------------------------------------------------------

-- v1 uses a TEXT check constraint (not the schema.sql enum), so extend it.
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets
  add constraint tickets_status_check
  check (status in ('pending', 'open', 'in_progress', 'resolved', 'closed'));

-- NOTE: the stale supabase/schema.sql uses a ticket_status ENUM, but live DBs built
-- from migrations/ v1 use the TEXT check above, so no enum backfill is needed here.
-- (ALTER TYPE ... ADD VALUE cannot run inside the SQL editor's transaction, so it
-- is deliberately absent. Reconcile schema.sql separately.)

-- ---------------------------------------------------------------------------
-- 1. Grants: undo deny-all for authenticated READS (+ own INSERT on tickets)
-- ---------------------------------------------------------------------------

grant select on public.profiles           to authenticated;
grant select on public.categories         to authenticated;
grant select on public.tickets            to authenticated;
grant insert on public.tickets            to authenticated;
grant select on public.ticket_events     to authenticated;
grant select on public.messages          to authenticated;
grant select on public.attachments       to authenticated;
grant select on public.known_issues       to authenticated;
grant select on public.canned_responses   to authenticated;
grant select on public.app_settings       to authenticated;
-- role_invites: intentionally NO grant (server-only).

-- ---------------------------------------------------------------------------
-- 2. profiles: own row, or any row for desk (agent/admin tables need names)
-- ---------------------------------------------------------------------------

drop policy if exists "profiles select own or desk" on public.profiles;
create policy "profiles select own or desk"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_desk_user());

-- ---------------------------------------------------------------------------
-- 3. tickets: requester sees own, desk sees all; anyone authed can file own
-- ---------------------------------------------------------------------------

drop policy if exists "tickets select own or desk" on public.tickets;
create policy "tickets select own or desk"
  on public.tickets for select to authenticated
  using (requester_id = auth.uid() or public.is_desk_user());

drop policy if exists "tickets insert own" on public.tickets;
create policy "tickets insert own"
  on public.tickets for insert to authenticated
  with check (requester_id = auth.uid());

-- No UPDATE/DELETE policies: mutations stay server-side (optimistic-concurrency
-- version checks + role gates live in the server functions).

-- ---------------------------------------------------------------------------
-- 4. Children follow the parent ticket (events, messages, attachments)
-- ---------------------------------------------------------------------------

drop policy if exists "ticket_events select with ticket" on public.ticket_events;
create policy "ticket_events select with ticket"
  on public.ticket_events for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = ticket_events.ticket_id
      and (t.requester_id = auth.uid() or public.is_desk_user())
  ));

drop policy if exists "messages select with ticket" on public.messages;
create policy "messages select with ticket"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = messages.ticket_id
      and (t.requester_id = auth.uid() or public.is_desk_user())
  ));

drop policy if exists "attachments select with ticket" on public.attachments;
create policy "attachments select with ticket"
  on public.attachments for select to authenticated
  using (exists (
    select 1 from public.tickets t
    where t.id = attachments.ticket_id
      and (t.requester_id = auth.uid() or public.is_desk_user())
  ));

-- ---------------------------------------------------------------------------
-- 5. Reference data: readable by any signed-in user, written server-side
-- ---------------------------------------------------------------------------

drop policy if exists "categories select authed" on public.categories;
create policy "categories select authed"
  on public.categories for select to authenticated using (true);

drop policy if exists "known_issues select authed" on public.known_issues;
create policy "known_issues select authed"
  on public.known_issues for select to authenticated using (true);

drop policy if exists "canned select authed" on public.canned_responses;
create policy "canned select authed"
  on public.canned_responses for select to authenticated using (true);

drop policy if exists "settings select authed" on public.app_settings;
create policy "settings select authed"
  on public.app_settings for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 6. Storage: private bucket, exact-key match against visible attachments
--    Keys look like tickets/{ticket_id}/{uuid}-{filename} (see presign code).
-- ---------------------------------------------------------------------------

drop policy if exists "ticket files readable by viewers" on storage.objects;
create policy "ticket files readable by viewers"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.attachments a
      join public.tickets t on t.id = a.ticket_id
      where a.storage_key = storage.objects.name
        and (t.requester_id = auth.uid() or public.is_desk_user())
    )
  );

-- No storage INSERT/UPDATE/DELETE policies: uploads use presigned URLs
-- (service-role), exactly as today.

-- ---------------------------------------------------------------------------
-- Verify (run as an authenticated non-desk user, then as agent):
--   select count(*) from public.tickets;            -- own rows only
--   select * from public.tickets where requester_id <> auth.uid(); -- 0 rows
--   select count(*) from public.role_invites;       -- ERROR (denied)
-- As anon (logged out): every table returns 0 rows / denied.
-- ---------------------------------------------------------------------------
