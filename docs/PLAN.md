# Build Plan — Sphere Support Desk (60-minute execution)

## Phases

| Phase | Scope | Target |
|---|---|---|
| P0 | Read brief, PRD, plan, test cases, scaffold Next.js | 0–10 min |
| P1 | Supabase schema + storage, server lib (db, email, validation, auth) | 10–20 min |
| P2 | API routes: create/lookup tickets, admin list/update, login | 20–30 min |
| P3 | UI: submit form + confirmation, tracking pages, admin dashboard | 30–50 min |
| P4 | Wire env, smoke test, git commits, deploy to Vercel, walkthrough notes | 50–60 min |

## Architecture — updated 2026-10-06 (below was: `apps/web`, Next.js 16)

> Current truth: single Vite + TanStack Router SPA at repo root (`src/`,
> `src/routes/*`, `src/features/*`, `src/components/*`, `src/lib/*`),
> contracts vendored (`src/lib/contracts.ts`), Bun (`bun.lock`), Vercel builds
> `bun run build` → `dist/`. The tree below is the original assessment scaffold.

```
apps/web/src/                  # Next.js 16 App Router + React 19 — UI + API routes
  app/
    (employee)/tickets/        # submit form, my-tickets, ticket detail
    (desk)/desk/               # agent queue, kanban, ticket reply, admin
    (public)/sign-in           # mock sign-in, access denied
    layout.tsx                 # AppShell + SessionHeader (components/layout)
  features/                    # domain-owned UI (imports flow one way ↓)
    tickets/                   # TicketForm, TicketCard, TicketConfirmation,
                               # UploadZone, AttachmentList, StatusTimeline,
                               # categories.ts, uploads.ts
    desk/                      # queue, kanban, composer, AdminTicketActions
    admin/ auth/               # management tables, session hooks/gates
  components/
    layout/                    # AppShell, SiteHeader/Footer, SessionHeader
    ui/                        # brand system: Badge, Panel, Form, Timeline
    shadcn/                    # vendored Radix primitives (do not hand-edit)
  lib/                         # cross-cutting: api, auth, config, utils
                               # contracts (@pearl27/contracts) is source of
                               # truth; lib/types is a legacy shim
packages/contracts + api-client# shared Zod schemas + typed fetch client
supabase/schema.sql            # tables, indexes, RLS, storage bucket
docs/ PRD.md · PLAN.md · TEST_CASES.md · WALKTHROUGH.md
```

Import rule: `features/*` → `components/ui|layout + lib + packages/*`.
Never `components/*` → `features/*` (except session hooks passed via props
where already established). No `features/*` barrels — use deep imports
(`@/features/tickets/TicketCard`) to avoid cycles and RSC bloat.

## Key flows

1. **Create ticket:** browser POSTs `multipart/form-data` → route handler validates → inserts `tickets` row + `created` event → uploads files to private `attachments` bucket → sends confirmation email → returns reference → UI shows confirmation state.
2. **Track:** GET by reference (exact) or email (list). Detail page renders status, timeline, signed URLs (60-min expiry) for attachments.
3. **Admin:** sign in with an invited work email → session cookie → dashboard fetches via role-gated routes → PATCH status writes `status_changed` event, stamps `resolved_at`, fires resolution email. Deactivation demotes to employee; unknown addresses can only ever be employees.

## Lovable-Modern lock (lead decision 2026-10-06)

- Target: TanStack Start SSR (Modern, `tech_stack:modern`), keep file-based
  TanStack Router (`src/routes/*`, `router.tsx`, `routeTree.gen.ts`). No
  `react-router-dom` downgrade, no Drizzle (`supabase-js` direct stays).
- Backend: own Supabase project (direct ownership, dashboard-managed Google
  OAuth). Secrets server-only via Workers bindings / `createServerFn`;
  `VITE_*` public only.
- Enum winner (resolves BACKEND_HANDOFF drift): superset
  `pending|open|in_progress|resolved|closed`. Contracts Zod is source of truth;
  `supabase/schema.sql` enum must be migrated to match before RLS work.
- Git safety: `pre-lovable-modern` tag + `pre-flatten-backup` stash preserve
  history. Flatten executes on `chore/lovable-modern`, no `reset --hard`.
- 2026-10-06 status: flatten DONE + Bun primary (`bun.lock`, pnpm removed,
  `package-lock.json` dropped, Vercel uses `bun install`/`bun run build`).
  `typecheck` + `test` (55) + `build` green. TanStack Start SSR parked locally
  (hung at transform; `vite.config.ts` stays SPA, Start deps + `src/server.ts`
   stub kept for import day — Lovable runs its own Modern upgrade). InsForge SDK
   removed 2026-10-06 (no InsForge anywhere); auth/session/export rewired to
   Supabase Auth (`src/features/auth/supabase-auth.ts`); `src/lib/supabase.ts` anon client
  is the session + direct-read path. RLS Phase-1 FINALIZED at
  `supabase/migrations/20261006_user_scoped_rls.sql` (run in Supabase SQL editor).

## Risk log

| Risk | Mitigation |
|---|---|
| No Supabase project/keys during build | Everything behind env vars + `.env.example`; `supabase/schema.sql` is copy-paste runnable |
| No email API key | `email.ts` no-ops with a server log; feature flags on automatically when key exists |
| Timebox overrun | Brief's must-haves built first (P2/P3 form before admin polish) |
