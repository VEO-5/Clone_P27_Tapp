# Walkthrough — Sphere Support Desk

A five-minute demo script for the live assessment.

## What this is

Pearl 27 employees submit Sphere account issues, attach screenshots, and track status with a reference like `PRL-7K4M2X`. System Support triages from a gated dashboard. Email notifications fire when configured; without Resend the app still works and logs instead.

## Stack (and why)

- **Next.js App Router + TypeScript** — UI and Node backend in one deploy. Route handlers are the backend.
- **Supabase Postgres + private Storage** — schema in `supabase/schema.sql`. Without keys, a local `.data/` store keeps the demo running.
- **Access-code admin session** — HMAC-signed HttpOnly cookie. Upgrade path: Supabase Auth + roles.

## Demo path

1. **Submit** (`/`) — fill the form, drop a screenshot, submit. Confirmation shows the reference and a "Track this ticket" link.
2. **My tickets** (`/my-tickets`) — sign in with the same work email (no password). Every ticket and its status stay on this page for 30 days.
3. **Track** (`/track/PRL-…`) — one ticket: status badge, attachments, chronological timeline.
4. **Admin** (`/admin`) — access code (default `pearl27` locally). KPI cards, search, status filter.
5. **Triage** (`/admin/tickets/[id]`) — move Open → In progress → Resolved, change priority, post a reply. Reload the employee page: the timeline updated.
6. **Sign out** — cookie cleared; `/admin` returns to login.

## Talking points

- Validation is the same Zod schema on the client and the server.
- Attachments never sit in a public bucket; they go through `/api/attachments/[id]`.
- Status workflow is a pure function (`planUpdate`) so both storage backends behave the same.
- Footer chips show whether Supabase and Resend are live or in fallback mode.
