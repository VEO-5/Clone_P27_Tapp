# PRD — Pearl 27 Sphere Support Desk

**Author:** Godstime Erubami · **Date:** 2026-09-01 · **Timebox:** 60-minute live technical assessment

## 1. Problem

Pearl 27 employees experience issues with their Sphere accounts and need a fast, trustworthy way to request help from the System Support team. Today there is no structured intake: issues arrive ad-hoc, get lost, and employees have no visibility into progress.

## 2. Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | Employees can submit a support ticket in under 60 seconds | Form completion, confirmation state |
| G2 | Employees can track ticket status without calling support | Self-serve tracking by reference / email |
| G3 | Support team can triage, update, and resolve tickets from one dashboard | Admin dashboard with status workflow |
| G4 | Employees are notified by email when their ticket is resolved | Transactional email on resolution |

**Non-goals (timebox):** SSO/SAML, SLA timers, multi-tenant orgs, in-app chat, analytics warehouse.

## 3. Users

- **Employee (requester):** submits and tracks tickets. No account required — identified by email + ticket reference.
- **Support agent (admin):** signs into the dashboard, triages, updates status/priority, replies, resolves.

## 4. Functional Requirements

### 4.1 Ticket submission (brief requirement — must-have)
- Fields: employee name, employee email, issue title, issue description — all required, validated client- and server-side.
- Optional: category, priority, **screenshot/file upload** (multiple files, images/PDF, ≤ 5 MB each).
- Clear **Submit** button with loading state.
- **Confirmation state** after submit: success screen with a human-friendly ticket reference (e.g. `PRL-4F2K9Q`), a link to track it, and email confirmation (when email service is configured).

### 4.2 Ticket tracking (exceeds brief)
- `/my-tickets`: employee inbox. Sign in with the work email used at submit (no password). Session lasts 30 days so they can always come back and see Open / In progress / Resolved / Closed.
- `/track`: look up a single ticket by reference.
- Ticket detail: status badge, priority, submitted files, and a chronological **event timeline** (created, status changes, support replies).

### 4.3 Admin dashboard (exceeds brief)
- Email identity for every role (no shared access-code: one leak must never compromise the whole desk). Employees sign in with any `@pearl27.com` address; agent/admin powers are granted by admin invite only — unknown addresses can only ever be employees.
- Deactivation demotes instead of locking out: a deactivated agent/admin signs in as a normal employee with history intact, plus a one-time notice.
- KPI cards: open, in progress, resolved, total.
- Ticket table: search, filter by status/priority, sorted newest first.
- Ticket detail: change status, change priority, post a reply (visible on the employee timeline), view/download attachments via signed URLs.
- Setting status → **Resolved** triggers a resolution email to the employee.

### 4.4 Email notifications (exceeds brief)
- On creation: confirmation email with reference.
- On resolution: "your ticket has been resolved" email.
- Provider: Resend. Degrades gracefully to a no-op + server log when `RESEND_API_KEY` is absent, so the core app never breaks.

## 5. Technical Decisions (and why)

| Decision | Rationale |
|---|---|
| **Next.js 15 (App Router, TypeScript)** — one app in `frontend/`; API route handlers run on the **Node.js runtime** and are the backend | One codebase, one deploy → live URL fastest. Route handlers are real Node server code (validation, Supabase service-role access, email). A separate Express service would double deploy surface for zero user value in this timebox. |
| **Supabase (Postgres + Storage)** | Managed, instant, SQL migrations in-repo (`supabase/schema.sql`). Storage bucket is **private**; files served via short-lived signed URLs. |
| **RLS locked down; all DB access via service-role key on the server only** | No anon key exposure of data; browser never talks to the DB directly. |
| **Access-code admin session (HTTP-only, SameSite=Lax cookie)** → **replaced: email identity, invite-only elevation** | A shared code is a single point of compromise with no audit trail. Per-user email identity + admin invites + demote-on-deactivate replaced it before production. |
| **Tailwind CSS v4 + hand-built design system** | Distinctive "pearl" brand (ivory surface, deep ink, iridescent accent) instead of a generic component-library look. |
| **Deploy: Vercel** | Zero-config Next.js hosting, env vars in dashboard. |

## 6. Data Model

- `tickets` — id (uuid), reference (unique), name, email, title, description, category, status (`open|in_progress|resolved|closed`), priority (`low|medium|high|urgent`), created_at, updated_at, resolved_at.
- `ticket_attachments` — id, ticket_id → tickets, file_name, storage_path, mime_type, size_bytes.
- `ticket_events` — id, ticket_id → tickets, type (`created|status_changed|reply`), message, actor (`employee|support|system`), created_at.

## 7. Success Criteria

1. All brief requirements demonstrably work on the live URL.
2. Tracking + admin + email flows work end-to-end.
3. Codebase is organized, typed, and explainable in a walkthrough.
