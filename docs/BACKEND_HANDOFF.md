# Backend Handoff — Pearl27 Ticketing (frontend complete)

Frontend owns: `apps/web` UI + `packages/contracts` + `packages/api-client`.
All fetch goes via api-client with `credentials: include`, base = `NEXT_PUBLIC_API_URL`,
JSON + `{ error: { code, message, fieldErrors? } }` envelope.
Source of truth: `packages/contracts/src/index.ts`.

## Prod vs reference split

- Prod bundle: NO `MockProvider` worker, NO `public/mockServiceWorker.js` activation,
  NO `p27_session=mock-*`, NO `/mock-*` endpoints. Set `NEXT_PUBLIC_API_MOCK=false`.
- Reference only (do NOT ship, do read): `apps/web/src/mocks/handlers.ts`
  — working spec mirroring prod gates (401/403) + shapes. Delete `src/mocks/`
  only after backend returns 200s.

## Auth contract (mirror `handlers.ts:92-137`)

- `GET /auth/me` → `Profile { id, email, name, avatarUrl?, role }` or 401 `UNAUTHENTICATED`
- `POST /auth/resolve { email }` → lookup; unknown `@pearl27.com` = employee;
  bad domain = 422 `INVALID_EMAIL`
- `POST /auth/logout` → 204, clear HttpOnly `p27_session`
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

- `TicketStatus: pending|open|in_progress|resolved`,
  `TicketPriority: low|medium|high|urgent` (`packages/contracts`).
  Note drift: old `supabase/schema.sql` + `lib/types.ts` mention `closed` — confirm winner before migration.
- `createTicketSchema`: title 5–140, description 20–5000, `categoryId` required,
  `priority` defaults `medium`. Validate category/priority + files server-side
  (5MB, png/jpeg/webp/gif/pdf/txt, max 5).
- `send` requires `version` (optimistic concurrency): 409 `VERSION_CONFLICT`,
  403 `LOCKED_BY_OTHER`.

## Env

Frontend: `NEXT_PUBLIC_API_URL`. Server-only: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SESSION_SECRET`.
Private bucket `ticket-attachments` (5MB, mime allowlist).

## NEVER copy to prod

`POST /mock-session`, `/mock-invites/restore`, `/mock-reset`,
`PUT /mock-uploads/*`, `GET /mock-files/*`.
