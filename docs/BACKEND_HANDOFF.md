# Backend Handoff — Pearl27 Ticketing (frontend complete)

> Stack-note (2026-10-06): paths/`NEXT_PUBLIC_*` names below are the original
> assessment scaffold. Current: UI in `src/` (+ `src/features/*`), contracts
> vendored at `src/lib/contracts.ts`, api-client at `src/lib/api-client.ts`,
> live server reference at `_reference/backend-api.reference.ts`, frontend base
> = `VITE_API_URL`. Endpoint shapes, gates, and error envelope unchanged.

Frontend owns: `apps/web` _(now `src/`)_ UI + `packages/contracts` _(now `src/lib/contracts.ts`)_ + `packages/api-client`.
All fetch goes via api-client with `credentials: include`, base = `NEXT_PUBLIC_API_URL` _(now `VITE_API_URL`)_,
JSON + `{ error: { code, message, fieldErrors? } }` envelope.
Source of truth: `packages/contracts/src/index.ts` _(vendored: `src/lib/contracts.ts`)_.

## Prod vs reference split — DONE 2026-10-06

- Mock layer deleted: no `MockProvider`, no `public/mockServiceWorker.js`, no
  `/mock-*` endpoints, no `VITE_API_MOCK`. Nothing mock remains to leak.
- Reference only (do NOT ship, do read): `_reference/backend-api.reference.ts`
  — working spec mirroring prod gates (401/403) + shapes.

## Auth contract (Supabase JWT, updated 2026-10-06 — was: `p27_session` cookie)

- Client signs in via Supabase Auth (`src/features/auth/supabase-auth.ts`);
  every `apiFetch` sends the Supabase access-token Bearer. Server validates
  the JWT (was: HttpOnly `p27_session` cookie).
- `GET /auth/me` → `Profile { id, email, name, avatarUrl?, role }` or 401 `UNAUTHENTICATED`
- `POST /auth/resolve { email }` → lookup; unknown `@pearl27.com` = employee;
  bad domain = 422 `INVALID_EMAIL`
- Logout is client-side: `supabase.auth.signOut()` (server holds no session —
  stateless JWT per request, so no `/auth/logout` route exists or is needed)
- Gates: non-public routes 401 when signed out; desk routes 403 unless agent+;
  admin routes 403 unless admin.

## Endpoints (implement in order)

MVP: `GET /categories`, `GET /known-issues`, `POST /tickets`,
`GET /tickets/mine`, `GET /tickets/:reference`,
`POST /tickets/:id/attachments/presign` → `PUT uploadUrl` →
`POST /tickets/:id/attachments/:attachmentId/complete`,
`GET /attachments/:id/url` (short-lived, never public bucket URL).

Desk (agent+): `GET /desk/dashboard`, `GET /desk/tickets`, `GET /desk/tickets/:id`,
`POST /desk/tickets/:id/claim|release|assign|send|presence`,
`GET /desk/agents|activity|canned-responses`, `GET /desk/events` (SSE:
`ticket.updated`, `message.created`, `presence`, `heartbeat`).

Admin (admin-only): `GET/POST /admin/agents|admins`, `DELETE` deactivates,
`GET /admin/dashboard|audit|settings|known-issues|export`,
`PATCH /admin/settings|categories|known-issues`, `POST /admin/known-issues/:id/end`.

Extras: `POST /tickets/:id/csat { score 1-5 }` (resolved only),
`GET /tickets/mine/updates|unrated`.

## Types / validation

- `TicketStatus: pending|open|in_progress|resolved|closed` — drift RESOLVED
  2026-10-06 (superset; `packages/contracts` + live check constraint updated).
  `TicketPriority: low|medium|high|urgent` (`packages/contracts`).
- `createTicketSchema`: title 5–140, description 20–5000, `categoryId` required,
  `priority` defaults `medium`. Validate category/priority + files server-side
  (5MB, png/jpeg/webp/gif/pdf/txt, max 5).
- `send` requires `version` (optimistic concurrency): 409 `VERSION_CONFLICT`,
  403 `LOCKED_BY_OTHER`.

## Env — updated 2026-10-06 (was: `NEXT_PUBLIC_*`)

Frontend: `VITE_API_URL` (+ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for direct
reads allowed by RLS). Server-only (never `VITE_` prefix): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SESSION_SECRET`.
Private bucket `ticket-attachments` (5MB, mime allowlist) — reads via short-lived
signed URLs; direct storage SELECT policy in `supabase/migrations/20261006_user_scoped_rls.sql`.

## NEVER copy to prod — DONE 2026-10-06 (all deleted)

~~`POST /mock-session`, `/mock-invites/restore`, `/mock-reset`,
`PUT /mock-uploads/*`, `GET /mock-files/*`~~ — removed with `src/mocks/`.
