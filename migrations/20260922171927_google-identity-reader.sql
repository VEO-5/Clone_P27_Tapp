-- Expose the Google name/photo InsForge stores in auth.user_providers to the
-- Edge Function (admin client) without opening the auth schema to browsers.
--
-- Why a function: PostgREST only serves exposed schemas, so the Edge Function
-- cannot SELECT auth.user_providers directly. This SECURITY DEFINER reader
-- runs with owner privileges and returns one row for the requested user.
--
-- Lockdown: EXECUTE revoked from PUBLIC/anon/authenticated (same posture as
-- the is_admin/is_desk helpers after hardening). Only the owner/admin role —
-- which the Edge Function admin key acts as — can call it, and it only
-- returns Google's own name/avatar strings (no tokens, no emails).

create or replace function public.google_identity(p_user_id uuid)
returns table (name text, avatar text)
language sql stable security definer set search_path = '' as $$
  select
    up.provider_data ->> 'name',
    up.provider_data ->> 'avatar'
  from auth.user_providers up
  where up.user_id = p_user_id
    and up.provider = 'google'
  limit 1;
$$;

revoke execute on function public.google_identity(uuid) from public, anon, authenticated;

alter function public.google_identity(uuid) set search_path = '';
