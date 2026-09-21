-- role_invites: pre-provisioned desk roles claimed on first login.
-- Admin invites an email before the user has an auth id, so the invite is
-- email-keyed (lowercased). profile() auto-provision checks this table first:
-- hit -> create profile with invited role + delete invite (single-use claim);
-- miss -> employee as before. Demote clears any pending invite for that email.

create table if not exists public.role_invites (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('agent','admin')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists role_invites_role_idx on public.role_invites (role);

-- Same access model as the rest of the app: RLS on, no browser grants,
-- all access via the Edge Functions admin client (bypasses RLS).
alter table public.role_invites enable row level security;
revoke all on public.role_invites from anon, authenticated;
