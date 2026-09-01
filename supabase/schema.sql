-- Pearl 27 Sphere Support Desk — database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_event_type as enum ('created', 'status_changed', 'priority_changed', 'reply');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_actor as enum ('employee', 'support', 'system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tickets (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  employee_name   text not null,
  employee_email  text not null,
  title           text not null,
  description     text not null,
  category        text not null default 'other',
  status          ticket_status not null default 'open',
  priority        ticket_priority not null default 'medium',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create table if not exists public.ticket_attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.ticket_events (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  type        ticket_event_type not null,
  message     text not null,
  actor       ticket_actor not null default 'system',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes — support the lookup paths the app actually uses
-- ---------------------------------------------------------------------------

create index if not exists tickets_email_idx       on public.tickets (lower(employee_email));
create index if not exists tickets_status_idx      on public.tickets (status);
create index if not exists tickets_created_at_idx  on public.tickets (created_at desc);
create index if not exists attachments_ticket_idx  on public.ticket_attachments (ticket_id);
create index if not exists events_ticket_idx       on public.ticket_events (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tickets_touch_updated_at on public.tickets;
create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Deliberately no policies: RLS is enabled and nothing is granted to the
-- `anon` / `authenticated` roles, so the browser can never read or write these
-- tables directly. All access goes through Next.js route handlers using the
-- service-role key, which bypasses RLS and is never shipped to the client.
-- ---------------------------------------------------------------------------

alter table public.tickets            enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_events      enable row level security;

revoke all on public.tickets            from anon, authenticated;
revoke all on public.ticket_attachments from anon, authenticated;
revoke all on public.ticket_events      from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage — private bucket for screenshots, read via short-lived signed URLs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
