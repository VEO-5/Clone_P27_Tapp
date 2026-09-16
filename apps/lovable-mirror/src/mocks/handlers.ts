import { http, HttpResponse } from "msw";

import { roleAtLeast, type RoleName } from "../lib/auth";
import {
  addAdmin,
  addAgent,
  deactivateAdmin,
  deactivateAgent,
  getMockProfile,
  lookupMockIdentity,
  mockAdmins,
  mockAgents,
  resetAdmins,
  resetAgents,
  restoreMockDirectory,
  setMockSession,
  setMockSessionIdentity,
  type MockJournalEntry,
  type MockProfile,
} from "./fixtures";
import {
  addEmployeeTicket,
  completeUpload,
  createPresigned,
  employeeCounts,
  employeeUpdates,
  getEmployeeTicketById,
  getEmployeeTicketByReference,
  listEmployeeTickets,
  mockKnownIssues,
  rateTicket,
  resetEmployeeStore,
  shouldFailFirstPut,
  unratedResolvedTickets,
} from "./employee";
import {
  assignTicket,
  claimTicket,
  deskActivity,
  deskAgents,
  deskDashboard,
  listDeskTickets,
  listOwnershipAudit,
  queryDeskTickets,
  releaseTicket,
  resetDeskStore,
} from "./desk";
import {
  getDeskDetail,
  heartbeat,
  pushLiveEmployeeMessage,
  resetConversations,
  resetPresence,
  sendToTicket,
} from "./conversations";
import {
  adminDashboard,
  auditItems,
  cannedResponses,
  createCategory,
  createKnownIssue,
  deleteCategory,
  endKnownIssue,
  exportCsv,
  getSettings,
  listCategories,
  listKnownIssues,
  patchSettings,
  resetAdminStore,
  resetCategories,
  updateCategory,
  updateKnownIssue,
} from "./admin";

import { config } from "../lib/config";

const API = config.apiUrl;

function serveMockFile() {
  return HttpResponse.arrayBuffer(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer as ArrayBuffer,
    { headers: { "Content-Type": "image/png" } },
  );
}

// ---------------------------------------------------------------------------
// Authorization (mock mirrors the prod contract): every non-public endpoint
// requires a session (401 when signed out) and desk/admin endpoints require
// the matching role (403 otherwise). Client RoleGates are UX only.
// ---------------------------------------------------------------------------

type Gate = { profile: MockProfile; response: null } | { profile: null; response: Response };

function gate(minimum?: RoleName): Gate {
  const profile = getMockProfile();
  if (!profile) {
    return {
      profile: null,
      response: HttpResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in again." } },
        { status: 401 },
      ),
    };
  }
  if (minimum && !roleAtLeast(profile.role as RoleName, minimum)) {
    return {
      profile: null,
      response: HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "You can't open this screen." } },
        { status: 403 },
      ),
    };
  }
  return { profile, response: null };
}

export const handlers = [
  http.get(`${API}/auth/me`, () => {
    const profile = getMockProfile();
    if (!profile) return HttpResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in again." } }, { status: 401 });
    return HttpResponse.json(profile);
  }),
  http.post(`${API}/auth/logout`, () => {
    setMockSession(null);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${API}/auth/resolve`, async ({ request }) => {
    // Email sign-in: resolve a work email to an identity. Unknown company
    // addresses become employees; malformed / foreign addresses are rejected.
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const lookup = lookupMockIdentity(String(body.email ?? ""));
    if (!lookup) {
      return HttpResponse.json(
        { error: { code: "INVALID_EMAIL", message: "Use your @pearl27.com work email." } },
        { status: 422 },
      );
    }
    return HttpResponse.json(lookup);
  }),
  http.post(`${API}/mock-session`, async ({ request }) => {
    // Mock-only: lets the page tell the worker realm which identity to serve.
    // The worker re-resolves the role from its own stores, so the page can
    // never self-elevate by requesting a role it wasn't granted.
    const body = (await request.json().catch(() => ({}))) as { role?: string; email?: string };
    if (body.role === "employee" || body.role === "agent" || body.role === "admin") {
      if (body.email) {
        const lookup = lookupMockIdentity(body.email);
        if (lookup) setMockSessionIdentity({ role: lookup.role, email: lookup.email, name: lookup.name });
        else setMockSession(body.role);
      } else {
        setMockSession(body.role);
      }
    } else if (body.role === null || body.role === undefined) {
      setMockSession(null);
    }
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${API}/mock-invites/restore`, async ({ request }) => {
    // Mock-only: replays the browser's directory journal (invites +
    // deactivations) into the worker realm on boot, BEFORE the session
    // reseed below. Without this, a worker restart wipes invites and
    // invitees drop to employee on refresh. Malformed entries are skipped.
    // NEVER copy this pattern to prod: the real backend persists invites in
    // its database, and an unauthenticated restore would be self-elevation.
    const body = (await request.json().catch(() => ({}))) as { entries?: unknown };
    const entries = Array.isArray(body?.entries) ? (body.entries as MockJournalEntry[]) : [];
    return HttpResponse.json(restoreMockDirectory(entries));
  }),
  http.post(`${API}/mock-reset`, () => {
    // Mock-only: full demo reset (stores + session). The page clears its
    // journal + cookie alongside; see DemoResetButton.
    resetAgents();
    resetAdmins();
    resetDeskStore();
    resetConversations();
    resetPresence();
    resetAdminStore();
    resetCategories();
    resetEmployeeStore();
    setMockSession(null);
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${API}/categories`, () => HttpResponse.json(listCategories())),
  http.get(`${API}/admin/categories`, () => HttpResponse.json(listCategories())),
  http.post(`${API}/admin/categories`, async ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { name?: string; formSchema?: unknown };
    const name = String(body.name ?? "").trim();
    if (!name) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { name: "Category name is required" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json(createCategory({ name, formSchema: body.formSchema }), { status: 201 });
  }),
  http.patch(`${API}/admin/categories/:id`, async ({ params, request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { name?: string; formSchema?: unknown };
    const category = updateCategory(String(params.id), { name: body.name, formSchema: body.formSchema });
    if (!category) {
      return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Category not found." } }, { status: 404 });
    }
    return HttpResponse.json(category);
  }),
  http.delete(`${API}/admin/categories/:id`, ({ params }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const ok = deleteCategory(String(params.id));
    if (!ok) {
      return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Category not found or required." } }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/known-issues`, () =>
    // Admin-published banners surface here alongside the seed (FE-5.7).
    HttpResponse.json([
      ...listKnownIssues()
        .filter((issue) => issue.active)
        .map((issue) => ({ id: issue.id, title: issue.title, message: issue.message })),
      ...mockKnownIssues.filter((seed) => !listKnownIssues().some((live) => live.id === seed.id)),
    ]),
  ),
  http.post(`${API}/tickets`, async ({ request }) => {
    const g = gate();
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      categoryId?: string;
      priority?: "low" | "medium" | "high" | "urgent";
    };
    if (!body.title || body.title.trim().length < 5) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { title: "Give your issue a short title (at least 5 characters)" } } },
        { status: 422 },
      );
    }
    if (!body.description || body.description.trim().length < 20) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { description: "Describe the issue in at least 20 characters so support can help" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      addEmployeeTicket(
        {
          title: String(body.title),
          description: String(body.description),
          categoryId: String(body.categoryId ?? "other"),
          priority: body.priority ?? "medium",
        },
        g.profile.id,
      ),
      { status: 201 },
    );
  }),
  http.get(`${API}/tickets/mine`, ({ request }) => {
    const g = gate();
    if (g.response) return g.response;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const cursor = url.searchParams.get("cursor");
    const all = listEmployeeTickets(g.profile.id);
    const start = cursor ? Number(cursor) : 0;
    const items = all.slice(start, start + limit);
    const next = start + limit < all.length ? String(start + limit) : null;
    return HttpResponse.json({ items, nextCursor: next, counts: employeeCounts(g.profile.id) });
  }),
  http.get(`${API}/tickets/mine/updates`, ({ request }) => {
    const g = gate();
    if (g.response) return g.response;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 5);
    return HttpResponse.json({ items: employeeUpdates(limit, g.profile.id) });
  }),
  http.get(`${API}/tickets/mine/unrated`, () => {
    const g = gate();
    if (g.response) return g.response;
    return HttpResponse.json({ items: unratedResolvedTickets(7, g.profile.id) });
  }),
  http.get(`${API}/tickets/:reference`, ({ params }) => {
    const g = gate();
    if (g.response) return g.response;
    const reference = String(params.reference);
    // PRL-9* references belong to another employee (FE-2.14 contract).
    if (/^prl-9/i.test(reference)) {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "You can't open another employee's ticket." } },
        { status: 403 },
      );
    }
    const ticket = getEmployeeTicketByReference(reference);
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "No ticket found with that reference." } },
        { status: 404 },
      );
    }
    // Owner or desk role. Anything else gets 404 (never confirm existence).
    const isDesk = roleAtLeast(g.profile.role as RoleName, "agent");
    if (ticket.requesterId !== g.profile.id && !isDesk) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "No ticket found with that reference." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/tickets/:id/attachments/presign`, async ({ params, request }) => {
    const g = gate();
    if (g.response) return g.response;
    const ticket = getEmployeeTicketById(String(params.id));
    const isDesk = roleAtLeast(g.profile.role as RoleName, "agent");
    if (!ticket || (ticket.requesterId !== g.profile.id && !isDesk)) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        { status: 404 },
      );
    }
    const body = (await request.json().catch(() => ({}))) as { fileName?: string };
    const { attachmentId, uploadUrl } = createPresigned(String(params.id), String(body.fileName ?? "file"));
    return HttpResponse.json({ attachmentId, uploadUrl: `${API}${uploadUrl}`, headers: {} });
  }),
  http.put(`${API}/mock-uploads/:attachmentId`, ({ params }) => {
    if (shouldFailFirstPut(String(params.attachmentId))) {
      return HttpResponse.json(
        { error: { code: "UPLOAD_FAILED", message: "Upload failed, try again." } },
        { status: 500 },
      );
    }
    return new HttpResponse(null, { status: 200 });
  }),
  http.post(`${API}/tickets/:id/attachments/:attachmentId/complete`, ({ params }) => {
    const g = gate();
    if (g.response) return g.response;
    const ticket = getEmployeeTicketById(String(params.id));
    const isDesk = roleAtLeast(g.profile.role as RoleName, "agent");
    if (!ticket || (ticket.requesterId !== g.profile.id && !isDesk)) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Upload not found." } },
        { status: 404 },
      );
    }
    const attachment = completeUpload(String(params.id), String(params.attachmentId));
    if (!attachment) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Upload not found." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(attachment);
  }),
  http.get(`${API}/attachments/:id/url`, ({ params }) => {
    const g = gate();
    if (g.response) return g.response;
    // Relative so the popup stays same-origin under the worker's scope.
    return HttpResponse.json({
      url: `/mock-files/${params.id}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),
  http.get(`${API}/mock-files/:id`, serveMockFile),
  // Same-origin variant for popups opened from the app origin.
  http.get(`*/mock-files/:id`, serveMockFile),
  http.post(`${API}/tickets/:id/csat`, async ({ params, request }) => {
    const g = gate();
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { score?: number; comment?: string };
    const ok = rateTicket(String(params.id), Number(body.score ?? 0), String(body.comment ?? ""), g.profile.id);
    if (!ok) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Score must be 1–5 on a resolved ticket.", fieldErrors: { score: "Pick 1–5" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),
  http.get(`${API}/desk/dashboard`, ({ request }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    const url = new URL(request.url);
    const range = url.searchParams.get("range") === "7" ? 7 : 30;
    return HttpResponse.json(deskDashboard(range));
  }),
  http.get(`${API}/desk/tickets`, ({ request }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    const url = new URL(request.url);
    const sp = url.searchParams;
    return HttpResponse.json(
      queryDeskTickets({
        tab: sp.get("tab") ?? "mine",
        assigneeId: sp.get("assigneeId") ?? undefined,
        status: sp.get("status") ?? undefined,
        priority: sp.get("priority") ?? undefined,
        categoryId: sp.get("categoryId") ?? undefined,
        q: sp.get("q") ?? undefined,
        sort: sp.get("sort") ?? undefined,
        cursor: sp.get("cursor") ?? undefined,
        limit: Number(sp.get("limit") ?? 10),
      }),
    );
  }),
  http.get(`${API}/desk/tickets/:id`, ({ params }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    const detail = getDeskDetail(String(params.id));
    if ("error" in detail) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(detail);
  }),
  http.post(`${API}/desk/tickets/:id/claim`, ({ params }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    try {
      const result = claimTicket(String(params.id));
      if (!result.ok) {
        if (result.error.code === "RESOLVED") {
          return HttpResponse.json(
            { error: { code: "RESOLVED", message: "This ticket is resolved. Change status to reopen it." } },
            { status: 422 },
          );
        }
        return HttpResponse.json(
          { error: { code: "ALREADY_ASSIGNED", message: `Already taken by ${result.error.assignee.name}`, assignee: result.error.assignee } },
          { status: 409 },
        );
      }
      return HttpResponse.json(result.ticket);
    } catch {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        { status: 404 },
      );
    }
  }),
  http.post(`${API}/desk/tickets/:id/release`, async ({ params, request }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const ticket = releaseTicket(String(params.id), body.reason, {
      id: g.profile.id,
      name: g.profile.name,
      role: g.profile.role,
    });
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        { status: 404 },
      );
    }
    if ("error" in ticket) {
      const code = ticket.error.code;
      if (code === "FORBIDDEN") {
        return HttpResponse.json(
          { error: { code: "FORBIDDEN", message: `Locked to ${ticket.error.ownerName} · view only` } },
          { status: 403 },
        );
      }
      if (code === "RESOLVED") {
        return HttpResponse.json(
          { error: { code: "RESOLVED", message: "This ticket is resolved. Change status to reopen it." } },
          { status: 422 },
        );
      }
      if (code === "REASON_TOO_LONG") {
        return HttpResponse.json(
          { error: { code: "VALIDATION_FAILED", message: "Keep the reason under 500 characters.", fieldErrors: { reason: "Keep it under 500 characters" } } },
          { status: 422 },
        );
      }
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "There's nothing to release — this ticket is unassigned." } },
        { status: 422 },
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/desk/tickets/:id/assign`, async ({ params, request }) => {
    // Admin-only: agents self-serve via claim, they never assign to others.
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { assigneeId?: string };
    const assigneeId = String(body.assigneeId ?? "").trim();
    if (!assigneeId) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Pick an agent.", fieldErrors: { assigneeId: "Choose an agent" } } },
        { status: 422 },
      );
    }
    const ticket = assignTicket(String(params.id), assigneeId, { id: g.profile.id, name: g.profile.name });
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket or agent not found." } },
        { status: 404 },
      );
    }
    if ("error" in ticket) {
      return HttpResponse.json(
        { error: { code: "RESOLVED", message: "This ticket is resolved. Change status to reopen it." } },
        { status: 422 },
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/desk/tickets/:id/send`, async ({ params, request }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
      status?: "open" | "in_progress" | "resolved";
      internal?: boolean;
      priority?: "low" | "medium" | "high" | "urgent";
      version?: number;
    };
    // Session role is authoritative (the gate above already enforced it).
    const result = sendToTicket(String(params.id), { ...body, version: Number(body.version ?? -1) }, g.profile.role);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Ticket not found." } }, { status: 404 });
      }
      if (result.code === "LOCKED_BY_OTHER") {
        return HttpResponse.json(
          { error: { code: "LOCKED_BY_OTHER", message: `Locked to ${result.ownerName} · view only`, ownerName: result.ownerName } },
          { status: 403 },
        );
      }
      if (result.code === "VERSION_CONFLICT") {
        return HttpResponse.json(
          { error: { code: "VERSION_CONFLICT", message: "This ticket changed while you were typing.", detail: result.detail } },
          { status: 409 },
        );
      }
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: result.message, fieldErrors: {} } },
        { status: 422 },
      );
    }
    return HttpResponse.json(result.detail);
  }),
  http.post(`${API}/desk/tickets/:id/presence`, ({ params }) => {
    const g = gate("agent");
    if (g.response) return g.response;
    heartbeat(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/desk/agents`, () => {
    const g = gate("agent");
    if (g.response) return g.response;
    return HttpResponse.json(deskAgents());
  }),
  http.get(`${API}/desk/activity`, () => {
    const g = gate("agent");
    if (g.response) return g.response;
    return HttpResponse.json({ items: deskActivity(), nextCursor: null });
  }),
  http.get(`${API}/desk/events`, () => {
    const g = gate("agent");
    if (g.response) return g.response;
    // Synthetic SSE: one ticket.updated shortly after connect, then heartbeats.
    const first = listDeskTickets().find((t) => !t.assignee) ?? listDeskTickets()[0]!;
    const stream = new ReadableStream({
      start(controller) {
        const encode = (event: string, data: unknown) =>
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        const beat = setInterval(() => {
          try {
            encode("heartbeat", { at: new Date().toISOString() });
          } catch {
            clearInterval(beat);
          }
        }, 15000);
        setTimeout(() => {
          try {
            encode("ticket.updated", {
              id: first.id,
              version: first.version + 1,
              status: first.status,
              assignee: first.assignee,
            });
            encode("presence", { ticketId: "t-desk-1", viewers: ["Ada Osei"] });
            const live = pushLiveEmployeeMessage();
            if (live) encode("message.created", live);
          } catch {
            // client went away — the interval cleanup handles the rest
          }
        }, 500);
      },
    });
    return new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } });
  }),
  http.get(`${API}/admin/dashboard`, ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const url = new URL(request.url);
    const range = url.searchParams.get("range");
    return HttpResponse.json(adminDashboard(range === "7" ? 7 : range === "90" ? 90 : 30));
  }),
  http.get(`${API}/admin/agents`, () => {
    const g = gate("admin");
    if (g.response) return g.response;
    return HttpResponse.json(mockAgents);
  }),
  http.post(`${API}/admin/agents`, async ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email.endsWith("@pearl27.com") || !email.includes("@")) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Use a pearl27.com address",
            fieldErrors: { email: "Use your pearl27.com address" },
          },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json(addAgent(email), { status: 201 });
  }),
  http.delete(`${API}/admin/agents/:id`, ({ params }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const agent = deactivateAgent(String(params.id));
    if (!agent) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(agent);
  }),
  http.get(`${API}/admin/admins`, () => {
    const g = gate("admin");
    if (g.response) return g.response;
    return HttpResponse.json(mockAdmins);
  }),
  http.post(`${API}/admin/admins`, async ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email.endsWith("@pearl27.com") || !email.includes("@")) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Use a pearl27.com address",
            fieldErrors: { email: "Use your pearl27.com address" },
          },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json(addAdmin(email), { status: 201 });
  }),
  http.delete(`${API}/admin/admins/:id`, ({ params }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const admin = deactivateAdmin(String(params.id));
    if (!admin) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Admin not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(admin);
  }),
  http.get(`${API}/admin/audit`, ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const url = new URL(request.url);
    // Live ownership trail first (claim/release/assign this session), then
    // the synthetic backlog — so admin audit reflects what just happened.
    const live = listOwnershipAudit().map((entry) => ({
      id: `audit-live-${entry.id}`,
      actor: entry.actorName,
      action:
        entry.action === "ticket.claimed"
          ? ("ticket.assigned" as const)
          : entry.action === "ticket.released"
            ? ("ticket.released" as const)
            : ("ticket.assigned" as const),
      entity: `ticket:${entry.reference}`,
      summary: `${entry.action} ${entry.reference}${entry.reason ? ` — ${entry.reason}` : ""}`,
      createdAt: entry.createdAt,
      diff: { assignee: { before: entry.beforeAssigneeId, after: entry.afterAssigneeId } },
    }));
    const page = auditItems(url.searchParams.get("cursor") ?? undefined, Number(url.searchParams.get("limit") ?? 15));
    return HttpResponse.json({ items: [...live, ...page.items].slice(0, Number(url.searchParams.get("limit") ?? 15)), nextCursor: page.nextCursor });
  }),
  http.get(`${API}/admin/settings`, () => {
    const g = gate("admin");
    if (g.response) return g.response;
    return HttpResponse.json(getSettings());
  }),
  http.patch(`${API}/admin/settings`, async ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { autoReleaseWorkingDays?: number };
    if (body.autoReleaseWorkingDays !== undefined && (!Number.isInteger(body.autoReleaseWorkingDays) || body.autoReleaseWorkingDays < 1)) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { autoReleaseWorkingDays: "Use at least 1 working day" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json(patchSettings(body));
  }),
  http.get(`${API}/admin/known-issues`, () => {
    const g = gate("admin");
    if (g.response) return g.response;
    return HttpResponse.json(listKnownIssues());
  }),
  http.post(`${API}/admin/known-issues`, async ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as { title?: string; message?: string; severity?: "minor" | "major" | "critical"; endsAt?: string };
    if (!body.title || body.title.trim().length < 5) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { title: "Give the issue a short title (at least 5 characters)" } } },
        { status: 422 },
      );
    }
    if (!body.message || body.message.trim().length < 20) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fieldErrors: { message: "Explain it in at least 20 characters" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      createKnownIssue({ title: String(body.title), message: String(body.message), severity: body.severity ?? "major", endsAt: body.endsAt }),
      { status: 201 },
    );
  }),
  http.patch(`${API}/admin/known-issues/:id`, async ({ params, request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const issue = updateKnownIssue(String(params.id), body);
    if (!issue) {
      return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Issue not found." } }, { status: 404 });
    }
    return HttpResponse.json(issue);
  }),
  http.post(`${API}/admin/known-issues/:id/end`, ({ params }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const issue = endKnownIssue(String(params.id));
    if (!issue) {
      return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Issue not found." } }, { status: 404 });
    }
    return HttpResponse.json(issue);
  }),
  http.get(`${API}/admin/export`, ({ request }) => {
    const g = gate("admin");
    if (g.response) return g.response;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";
    if (format !== "csv") {
      return HttpResponse.json({ error: { code: "VALIDATION_FAILED", message: "Only CSV export is supported." } }, { status: 422 });
    }
    return new HttpResponse(exportCsv(), { headers: { "Content-Type": "text/csv" } });
  }),
  http.get(`${API}/desk/canned-responses`, () => {
    const g = gate("agent");
    if (g.response) return g.response;
    return HttpResponse.json(cannedResponses());
  }),
];
