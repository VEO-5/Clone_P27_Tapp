# AGENTS.md

## Supabase backend

This project uses **Supabase**: Postgres database, Auth (Google OAuth +
passwordless email OTP), private Storage (`ticket-attachments`), and RLS.

- **Auth:** `src/features/auth/supabase-auth.ts` (Supabase Auth only — no
  third-party BaaS SDK). Session via `supabase.auth.getSession()` +
  `onAuthStateChange`; role resolves server-side (`GET /auth/me` → profiles).
- **API transport:** `src/lib/api.ts` `apiFetch` → `VITE_API_URL` with the
  Supabase access-token Bearer. The server validates the Supabase JWT.
- **RLS:** live model in `migrations/` (v1) + user-scoped Phase-1 policies in
  `supabase/migrations/20261006_user_scoped_rls.sql`. Reference users with
  `auth.users(id)`; use `auth.uid()` in RLS policies.
- **Credentials:** app code reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  from `.env.local`. Server-only secrets never use the `VITE_` prefix. Never
  hardcode or commit keys.

Key patterns:

- No mock layer: `src/mocks/` + MSW were deleted 2026-10-06. No `VITE_API_MOCK`.
- Database inserts take an array: `insert([{ ... }])`.
- For storage uploads, persist both the returned `url` and `key`.
