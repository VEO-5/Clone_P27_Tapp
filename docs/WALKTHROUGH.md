# Walkthrough — Sphere Support Desk

> Stack-note (2026-10-06): the "Stack" section below describes the original
> assessment scaffold (Next.js). Current truth: single Vite + TanStack Router
> SPA at repo root (Bun, `bun run dev` → :8080), own Supabase project backend.
> See `docs/PLAN.md` "Lovable-Modern lock". Demo path + talking points unchanged.

A five-minute demo script for the live assessment.

## What this is

Pearl 27 employees submit Sphere account issues, attach screenshots, and track status with a reference like `PRL-7K4M2X`. System Support triages from a gated dashboard. Email notifications fire when configured; without Resend the app still works and logs instead.

## Stack (and why) — updated 2026-10-06 (was: Next.js App Router)

- **Vite + TanStack Router (SPA) + TypeScript** — single app at repo root; TanStack Start SSR upgrade runs on Lovable import.
- **Supabase Postgres + private Storage** — live model in `migrations/` (v1: profiles, requester-scoped RLS in `supabase/migrations/20261006_user_scoped_rls.sql`); `supabase/schema.sql` is the stale original scaffold, do not treat as live truth.
- **Sessions** — Supabase Auth (Google OAuth + email OTP), roles resolve server-side from profiles.

## Demo path

1. **Submit** (`/`) — fill the form, drop a screenshot, submit. Confirmation shows the reference and a "Track this ticket" link.
2. **My tickets** (`/my-tickets`) — sign in with the same work email (no password). Every ticket and its status stay on this page for 30 days.
3. **Track** (`/track/PRL-…`) — one ticket: status badge, attachments, chronological timeline.
4. **Admin** (`/admin`) — sign in with an invited work email. KPI cards, search, status filter. Invite agents/admins by email; deactivated accounts fall back to employee.
5. **Triage** (`/admin/tickets/[id]`) — move Open → In progress → Resolved, change priority, post a reply. Reload the employee page: the timeline updated.
6. **Sign out** — cookie cleared; `/admin` returns to login.

## Talking points

- Validation is the same Zod schema on the client and the server.
- Attachments never sit in a public bucket; they go through `/api/attachments/[id]`.
- Status workflow is a pure function (`planUpdate`) so both storage backends behave the same.
- Footer chips show whether Supabase and Resend are live or in fallback mode.
