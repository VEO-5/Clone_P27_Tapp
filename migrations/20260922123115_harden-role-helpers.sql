-- Harden role-helper functions flagged by advisor (dangerous-function).
-- Context: RLS is deny-all by design (no policies, REVOKE ALL from anon/authenticated);
-- all app access goes via Edge Function admin client. These helpers exist for
-- future user-scoped RLS, so they must stay SECURITY DEFINER to read
-- RLS-protected public.profiles. Harden instead of converting to INVOKER:
--  1. Lock search_path to prevent hijacking.
--  2. Least privilege: revoke PUBLIC/anon, grant authenticated only.
--  3. Schema-qualify references.

create or replace function public.is_desk_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('agent','admin')
  );
$$;

create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Least privilege: anon never needs a role check. authenticated does
-- (future RLS policies + direct RPC). service_role/project_admin keep
-- access via ownership; no explicit grant needed.
revoke execute on function public.is_desk_user() from public, anon;
revoke execute on function public.is_admin_user() from public, anon;
grant execute on function public.is_desk_user() to authenticated;
grant execute on function public.is_admin_user() to authenticated;

-- Belt-and-braces: re-assert search_path even if CREATE OR REPLACE above
-- is ever edited without the SET clause.
alter function public.is_desk_user() set search_path = '';
alter function public.is_admin_user() set search_path = '';
