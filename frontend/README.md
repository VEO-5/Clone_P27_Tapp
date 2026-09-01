# Pearl 27 · Sphere Support Desk

Internal desk for Pearl 27 employees to report Sphere account issues, attach screenshots, and follow status. System Support triages from a gated dashboard.

Branding follows [pearl27.com](https://pearl27.com/) (cream, navy, copper, Cormorant Garamond).

## Run locally

From `frontend/`:

```bash
# If you have not already, copy env and fill keys
# cp .env.example .env

npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the dev server after changing `.env`.

One-time Supabase setup: Dashboard → SQL Editor → run `../supabase/schema.sql` (tables, RLS, private `ticket-attachments` bucket).

Footer chips show **Supabase connected** when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, or **Local store (dev fallback)** otherwise.

---

## Environment

Values live in `frontend/.env` (gitignored). `.env.example` is placeholders only.

| Variable | Required | What it does |
|---|---|---|
| `SUPABASE_URL` | For hosted DB | Project URL, `https://….supabase.co` — not the `postgresql://` string |
| `SUPABASE_SERVICE_ROLE_KEY` | For hosted DB | **service_role** secret (server only, never the anon key) |
| `SUPABASE_STORAGE_BUCKET` | No | Defaults to `ticket-attachments` |
| `ADMIN_ACCESS_CODE` | No | Support desk login. Defaults to `pearl27` |
| `SESSION_SECRET` | No | Signs admin + employee cookies. Set a long random string in production |
| `RESEND_API_KEY` | No | Sends confirmation / resolution email. Absent = log only |
| `EMAIL_FROM` | No | From address Resend allows |
| `SUPPORT_INBOX_EMAIL` | No | Optional alert to support on new tickets |
| `NEXT_PUBLIC_APP_URL` | No | Base URL in email links. Local: `http://localhost:3000` |

---

## Page routes

| Path | Who | What happens |
|---|---|---|
| `/` | Anyone | Submit a ticket (name, email, title, description, optional files) |
| `/my-tickets/login` | Employee | Sign in with the work email used at submit (no password) |
| `/my-tickets` | Employee (cookie) | Inbox: Open / In progress / Resolved / Closed + every ticket. Redirects to login if signed out |
| `/track` | Anyone | Look up by `PRL-XXXXXX` or email (email also opens My tickets) |
| `/track/[reference]` | Anyone with the code | One ticket: status, attachments, timeline |
| `/admin/login` | Support | Access-code sign in |
| `/admin` | Support (cookie) | Queue: KPI cards, search, status/priority filters. Redirects to login if signed out |
| `/admin/tickets/[id]` | Support (cookie) | Change status/priority, reply, view attachments |

---

## API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/tickets` | Public | Create ticket (`multipart/form-data`). Sets the employee cookie. Returns `{ ticket, emailSent }` |
| `GET` | `/api/tickets?ref=PRL-XXXXXX` | Public | One ticket by reference |
| `GET` | `/api/tickets?email=you@pearl27.com` | Public | All tickets for that email |
| `GET` | `/api/tickets/[reference]` | Public | Ticket + events + attachments |
| `GET` | `/api/attachments/[id]` | Public (unguessable id) | File via signed URL or streamed bytes |
| `POST` | `/api/me/login` | Public | Employee session cookie from `{ email }` |
| `DELETE` | `/api/me/login` | Cookie | Employee sign out |
| `POST` | `/api/admin/login` | Public | Support session from `{ accessCode }` |
| `DELETE` | `/api/admin/login` | Cookie | Support sign out |
| `GET` | `/api/admin/tickets` | Support | Queue + stats. Query: `?q=&status=&priority=` |
| `GET` | `/api/admin/tickets/[id]` | Support | Full ticket for the desk |
| `PATCH` | `/api/admin/tickets/[id]` | Support | Body: `{ status?, priority?, reply? }`. `resolved` stamps `resolved_at` and emails |

---

## Flows

### 1. Employee submits

1. Open `/` → fill the form → optional screenshots (PNG/JPEG/WebP/GIF/PDF/TXT, ≤ 5 MB, max 5).
2. `POST /api/tickets` validates, stores the row + files, writes a `created` event.
3. Confirmation shows `PRL-XXXXXX`. An employee cookie is set for 30 days.
4. If Resend is configured, a confirmation email is sent; otherwise the server logs it.

### 2. Employee comes back (My tickets)

1. **My tickets** in the header → `/my-tickets/login`.
2. Enter the same work email → `POST /api/me/login`.
3. `/my-tickets` lists every ticket for that email with live status.
4. Click a card → `/track/PRL-XXXXXX` (description, files, timeline).
5. **Sign out** → `DELETE /api/me/login`.

Submitting a ticket also signs them in, so **Open my tickets** works immediately.

### 3. Lookup by reference

1. `/track` → enter `PRL-XXXXXX` (case-insensitive) → `/track/PRL-XXXXXX`.
2. Unknown codes show a friendly empty state, not a raw 404.

### 4. Support triages

1. `/admin` → redirected to `/admin/login` if needed.
2. Access code (`ADMIN_ACCESS_CODE`, default `pearl27`) → HttpOnly cookie (8 hours).
3. Dashboard: search, filter, open a ticket.
4. Move **Open → In progress → Resolved → Closed**, change priority, post a reply.
5. Each change is a timeline event. Employees see it on `/track/…` and `/my-tickets`.
6. **Resolved** emails the employee when Resend is set.
7. **Sign out** → `DELETE /api/admin/login`.

```
Employee                         Support
   |                                |
   |  POST /api/tickets             |
   |------------------------------->|
   |  PRL-XXXXXX + cookie           |
   |<-------------------------------|
   |                                |
   |  GET /my-tickets               |
   |  GET /track/PRL-XXXXXX         |
   |                                |  PATCH /api/admin/tickets/:id
   |                                |  (status / priority / reply)
   |  reload — timeline updated     |
   |<-------------------------------|
```

---

## Status model

`open` → `in_progress` → `resolved` → `closed`

Priorities: `low` · `medium` · `high` · `urgent`

---

## Deploy (GitHub + Vercel)

1. In the **Supabase SQL Editor**, paste `../supabase/schema.sql` and **Run** it once. Without this, `/my-tickets` and submit fail with “Could not find the table `public.tickets`”.
2. Create a GitHub repo from the `ticketing` folder. Do **not** commit `.env` (it is gitignored).
3. On Vercel: Import the repo → **Root Directory** = `frontend` → add the same env vars as `frontend/.env`:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` = `ticket-attachments`
   - `ADMIN_ACCESS_CODE`
   - `SESSION_SECRET` (use a long random string in production)
   - `NEXT_PUBLIC_APP_URL` = your Vercel URL (set after the first deploy if needed)
   - Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_INBOX_EMAIL`

4. Redeploy after env vars are saved.

## Tests

```bash
npm test
```

Unit coverage: validation, attachments, reference codes, admin/employee session tokens, status workflow. Manual matrix: `../docs/TEST_CASES.md`. Demo script: `../docs/WALKTHROUGH.md`.
