# Build Plan — Sphere Support Desk (60-minute execution)

## Phases

| Phase | Scope | Target |
|---|---|---|
| P0 | Read brief, PRD, plan, test cases, scaffold Next.js | 0–10 min |
| P1 | Supabase schema + storage, server lib (db, email, validation, auth) | 10–20 min |
| P2 | API routes: create/lookup tickets, admin list/update, login | 20–30 min |
| P3 | UI: submit form + confirmation, tracking pages, admin dashboard | 30–50 min |
| P4 | Wire env, smoke test, git commits, deploy to Vercel, walkthrough notes | 50–60 min |

## Architecture

```
frontend/                        # Next.js 15 app — UI + Node backend (route handlers)
  src/
    app/
      page.tsx                   # Submit ticket (hero + form + confirmation state)
      track/page.tsx             # Lookup by reference or email
      track/[ref]/page.tsx       # Ticket detail + timeline
      admin/page.tsx             # Login or dashboard (cookie-gated)
      admin/tickets/[id]/page.tsx# Admin ticket detail
      api/
        tickets/route.ts         # POST create (multipart), GET ?email= / ?ref=
        tickets/[ref]/route.ts   # GET one ticket + events + signed attachment URLs
        admin/login/route.ts     # POST access code -> HTTP-only cookie
        admin/logout/route.ts    # POST clear cookie
        admin/tickets/route.ts   # GET all (filters) [auth]
        admin/tickets/[id]/route.ts # PATCH status/priority/reply [auth]
    lib/
      supabase.ts                # service-role client (server only)
      email.ts                   # Resend wrapper, no-op without key
      validation.ts              # input validation helpers
      adminAuth.ts               # cookie session sign/verify (HMAC)
      types.ts                   # shared domain types
    components/                  # TicketForm, UploadZone, StatusBadge, Timeline, ...
supabase/schema.sql              # tables, indexes, RLS, storage bucket
docs/ PRD.md · PLAN.md · TEST_CASES.md · WALKTHROUGH.md
```

## Key flows

1. **Create ticket:** browser POSTs `multipart/form-data` → route handler validates → inserts `tickets` row + `created` event → uploads files to private `attachments` bucket → sends confirmation email → returns reference → UI shows confirmation state.
2. **Track:** GET by reference (exact) or email (list). Detail page renders status, timeline, signed URLs (60-min expiry) for attachments.
3. **Admin:** login sets HMAC-signed cookie → dashboard fetches via authed routes → PATCH status writes `status_changed` event, stamps `resolved_at`, fires resolution email.

## Risk log

| Risk | Mitigation |
|---|---|
| No Supabase project/keys during build | Everything behind env vars + `.env.example`; `supabase/schema.sql` is copy-paste runnable |
| No email API key | `email.ts` no-ops with a server log; feature flags on automatically when key exists |
| Timebox overrun | Brief's must-haves built first (P2/P3 form before admin polish) |
