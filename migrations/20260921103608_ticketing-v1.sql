-- pearl27-ticketing v1 — full ticketing schema
-- Source of truth: packages/contracts/src/index.ts (TicketStatus pending|open|in_progress|resolved)
-- Access model: RLS enabled, no anon/authenticated grants; all access via Edge Functions admin client.

-- Profiles (1:1 with auth.users, role gates live here)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  avatar_url text,
  role text not null default 'employee' check (role in ('employee','agent','admin')),
  team_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories (id is text slug to match contracts Category.id string)
create table if not exists public.categories (
  id text primary key,
  name text not null,
  form_schema jsonb,
  created_at timestamptz not null default now()
);

-- Tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 20 and 5000),
  category_id text not null default 'other' references public.categories(id),
  status text not null default 'open' check (status in ('pending','open','in_progress','resolved')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  version integer not null default 0 check (version >= 0),
  chat_dm_url text,
  custom_fields jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Ticket events (append-only history)
create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  type text not null check (type in ('created','status_changed','reopened','resolved','message','internal_note','assigned','released')),
  message text,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

-- Messages (conversation thread)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_role text not null check (author_role in ('employee','agent','system')),
  author_id uuid references public.profiles(id) on delete set null,
  text text not null check (char_length(text) between 1 and 5000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

-- Attachments (metadata; bytes live in storage bucket ticket-attachments)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  storage_key text not null,
  storage_url text,
  status text not null default 'available' check (status in ('scanning','available','failed')),
  created_at timestamptz not null default now()
);

-- Known issues (banners + admin CRUD)
create table if not exists public.known_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  severity text not null default 'major' check (severity in ('minor','major','critical')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Canned responses (desk composer)
create table if not exists public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  shortcut text not null unique,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- App settings (single row id=1)
create table if not exists public.app_settings (
  id integer primary key check (id = 1),
  auto_release_working_days integer not null default 3 check (auto_release_working_days >= 1),
  business_hours jsonb not null default '[]'::jsonb,
  holidays jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- Seed default categories (match mock fixtures)
insert into public.categories (id, name) values
  ('other','Other'),
  ('it','IT & Equipment'),
  ('hr','HR & People'),
  ('facilities','Facilities'),
  ('finance','Finance')
on conflict (id) do nothing;

-- Indexes for app lookup paths
create index if not exists tickets_requester_idx on public.tickets (requester_id, created_at desc);
create index if not exists tickets_assignee_idx on public.tickets (assignee_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_reference_idx on public.tickets (reference);
create index if not exists tickets_created_idx on public.tickets (created_at desc);
create index if not exists events_ticket_idx on public.ticket_events (ticket_id, created_at);
create index if not exists messages_ticket_idx on public.messages (ticket_id, created_at);
create index if not exists attachments_ticket_idx on public.attachments (ticket_id);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists tickets_touch on public.tickets;
create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.app_settings;
create trigger settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- Role helper for future user-scoped RLS (SECURITY DEFINER avoids recursion)
create or replace function public.is_desk_user()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('agent','admin')
  );
$$;

create or replace function public.is_admin_user()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- RLS: enabled, browser gets nothing directly. Edge Functions admin client bypasses RLS.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.known_issues enable row level security;
alter table public.canned_responses enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.tickets from anon, authenticated;
revoke all on public.ticket_events from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.attachments from anon, authenticated;
revoke all on public.known_issues from anon, authenticated;
revoke all on public.canned_responses from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
