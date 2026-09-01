# Test Cases — Pearl 27 Sphere Support Desk

Coverage is split into two layers, arranged in the order a reviewer walks the product:

1. **Automated unit tests** — pure logic, run with `npm test`
2. **Manual QA** — click-through matrix for the live walkthrough (submit → track → admin)

---

## 0. Brief, cleaned up

Employees report Sphere issues (name, email, title, description, screenshots). They receive a reference and can track status (open → in progress → resolved → closed). Support triages from a dashboard. The UI must be rich and responsive — not a generic AI-tool look. Stack: Next.js + Node route handlers, Supabase (with a local fallback), file uploads.

---

## 1. Automated unit tests

Run: `cd frontend && npm test`

| ID | File | Assertion |
|----|------|-----------|
| U1 | `validation.test.ts` | Valid payload passes; email is lowercased and strings are trimmed |
| U2 | `validation.test.ts` | Missing name / email / title / description each produce a field-level error |
| U3 | `validation.test.ts` | Malformed email (`not-an-email`) is rejected |
| U4 | `validation.test.ts` | Title over 140 chars and description over 5 000 chars are rejected |
| U5 | `validation.test.ts` | Unknown category or priority falls back to the schema default |
| U6 | `validation.test.ts` | File over 5 MB is rejected with a size message |
| U7 | `validation.test.ts` | Disallowed MIME type (`application/x-msdownload`) is rejected |
| U8 | `validation.test.ts` | More than 5 files is rejected |
| U9 | `validation.test.ts` | PNG / JPEG / WebP / PDF under the limit are accepted |
| U10 | `reference.test.ts` | Reference matches `PRL-[A-Z2-9]{6}` and excludes ambiguous `O/0/I/1` |
| U11 | `reference.test.ts` | 2 000 generated references contain no duplicates |
| U12 | `adminAuth.test.ts` | A signed session token verifies successfully |
| U13 | `adminAuth.test.ts` | A tampered payload or signature fails verification |
| U14 | `adminAuth.test.ts` | An expired token fails verification |
| U15 | `workflow.test.ts` | `resolved` stamps `resolvedAt`; moving back to `open` clears it |
| U16 | `workflow.test.ts` | Status change produces a `status_changed` event with actor `support` |

---

## 2. Manual QA — ticket submission

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| T1 | Happy path | Fill name, email, title, description → Submit | Button shows loading, then confirmation with `PRL-XXXXXX` |
| T2 | Required fields | Submit an empty form | Inline errors under every required field; no network request; focus moves to first error |
| T3 | Invalid email | Enter `godstime@` → Submit | Inline "Enter a valid email address"; form not submitted |
| T4 | Server-side validation | `POST /api/tickets` with an empty body | `400` with a `fieldErrors` object |
| T5 | Screenshot upload | Attach 2 PNGs → Submit | Thumbnails listed with size, removable; both appear on the ticket detail page |
| T6 | Oversized file | Attach a 7 MB image | Rejected immediately with a size message; other files retained |
| T7 | Wrong file type | Attach a `.exe` | Rejected with an allowed-types message |
| T8 | Drag and drop | Drag a screenshot onto the upload zone | Zone highlights on drag-over; file is added on drop |
| T9 | Double submit | Click Submit twice quickly | Button disabled during flight; exactly one ticket created |
| T10 | Confirmation actions | Click "Track this ticket" | Navigates to `/track/PRL-XXXXXX` showing the new ticket |
| T11 | Copy reference | Click the copy control | Reference copied; "Copied" feedback shown |
| T12 | Submit another | Click "Submit another ticket" | Form resets to empty, no stale values |

---

## 3. Manual QA — employee inbox (My tickets)

Each employee has a persistent page at `/my-tickets`. They sign in with the work email they submitted with (no password). The session lasts 30 days on that device.

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| E1 | Auth gate | Visit `/my-tickets` while signed out | Redirected to `/my-tickets/login` |
| E2 | Sign in | Enter the email used on a ticket | Inbox lists every ticket for that email, newest first, with status counts |
| E3 | Invalid email | Enter `godstime@` | Inline validation error; no cookie set |
| E4 | After submit | Submit a ticket, click "Open my tickets" | Already signed in; new ticket is in the list |
| E5 | Return visit | Close the tab, reopen `/my-tickets` | Still signed in on this device (cookie) |
| E6 | Sign out | Click sign out | Cookie cleared; `/my-tickets` returns to login |
| E7 | Empty inbox | Sign in with an email that has no tickets | Helpful empty state + submit / lookup actions |

---

## 4. Manual QA — ticket tracking

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| K1 | Lookup by reference | `/track` → enter reference → Search | Redirects to the ticket detail page |
| K2 | Lookup by email | `/track` → enter employee email → Search | Lists every ticket for that email, newest first |
| K3 | Unknown reference | Enter `PRL-ZZZZZZ` | Friendly "no ticket found" state — not a crash or raw 404 |
| K4 | Case insensitivity | Enter `prl-xxxxxx` lowercase | Ticket still found |
| K5 | Detail contents | Open a ticket detail page | Status, priority, category, date, description, attachments, timeline all render |
| K6 | Timeline order | Ticket with several updates | Events chronological; actors labelled You / Support / System |
| K7 | Support reply visible | Agent posts a reply, reload employee page | Reply appears in the timeline attributed to Support |
| K8 | Attachment access | Click an attachment | Opens via `/api/attachments/[id]` (signed URL or streamed bytes — never a public bucket URL) |
| K9 | Privacy | Ticket detail page | Shows only that ticket; no way to enumerate others without a reference or email |

---

## 5. Manual QA — admin dashboard

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| A1 | Auth gate | Visit `/admin` while signed out | Redirected to `/admin/login` |
| A2 | Wrong access code | Submit a bad code | "Invalid access code" error, no cookie set |
| A3 | Correct access code | Submit the configured code | Session cookie (HttpOnly, SameSite=Lax) set; dashboard loads |
| A4 | API protection | `GET /api/admin/tickets` with no cookie | `401 Unauthorized` |
| A5 | KPI cards | Dashboard with mixed tickets | Open / In progress / Resolved / Total counts match the table |
| A6 | Search | Type part of a name, email, title, or reference | Table filters to matching rows |
| A7 | Status filter | Filter to "In progress" | Only in-progress tickets listed; filter reflected in the URL |
| A8 | Priority change | Set a ticket to Urgent | Persists after reload; `priority_changed` event added |
| A9 | Status workflow | Move Open → In progress → Resolved | Badge updates, `resolved_at` stamped, timeline records each change |
| A10 | Resolution email | Set a ticket to Resolved | Email sent when `RESEND_API_KEY` is set; otherwise it logs and the request still succeeds |
| A11 | Agent reply | Post a reply | Appears on both the admin and employee timelines |
| A12 | Logout | Click sign out | Cookie cleared; `/admin` redirects to login again |
| A13 | Empty state | Dashboard with no tickets | Purposeful empty state, not a blank table |

---

## 6. Manual QA — cross-cutting

| ID | Case | Expected |
|----|------|----------|
| X1 | Responsive — 375 px | Form, tracking, and dashboard usable; admin table becomes stacked cards; no horizontal scroll |
| X2 | Responsive — 1440 px | Layout is centred and constrained, not stretched full-bleed |
| X3 | Keyboard only | Every control reachable by Tab with a visible focus ring; upload zone activates with Enter/Space |
| X4 | Screen-reader labels | Every input has a `<label>`; errors linked via `aria-describedby`; submit result announced via `aria-live` |
| X5 | Reduced motion | With `prefers-reduced-motion`, decorative animation is disabled |
| X6 | Degraded backend | With Supabase env vars absent, the app still runs on the local fallback store |
| X7 | Error handling | Repo failure → readable error message; no stack trace leaks to the client |
| X8 | Secret hygiene | Service-role key and admin code never appear in the client bundle |
| X9 | Build health | `npm run lint && npx tsc --noEmit && npm run build` pass |
