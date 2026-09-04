import { http, HttpResponse } from "msw";

import {
  addAgent,
  deactivateAgent,
  getMockProfile,
  mockAgents,
  setMockSession,
} from "./fixtures";
import {
  addEmployeeTicket,
  completeUpload,
  createPresigned,
  employeeCounts,
  employeeUpdates,
  getEmployeeTicketByReference,
  listEmployeeTickets,
  mockCategories,
  mockKnownIssues,
  rateTicket,
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
  queryDeskTickets,
  releaseTicket,
} from "./desk";
import {
  getDeskDetail,
  heartbeat,
  pushLiveEmployeeMessage,
  sendToTicket,
} from "./conversations";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function serveMockFile() {
  return HttpResponse.arrayBuffer(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer as ArrayBuffer,
    { headers: { "Content-Type": "image/png" } },
  );
}

export const handlers = [
  http.get(`${API}/auth/me`, () => {
    const profile = getMockProfile();
    if (!profile) return HttpResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in again." } }, { status: 401 });
    return HttpResponse.json(profile);
  }),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/mock-session`, async ({ request }) => {
    // Mock-only: lets the page tell the worker realm which role to serve.
    const body = (await request.json().catch(() => ({}))) as { role?: string };
    if (body.role === "employee" || body.role === "agent" || body.role === "admin") {
      setMockSession(body.role);
    } else if (body.role === null || body.role === undefined) {
      setMockSession(null);
    }
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${API}/categories`, () => HttpResponse.json(mockCategories)),
  http.get(`${API}/known-issues`, () => HttpResponse.json(mockKnownIssues)),
  http.post(`${API}/tickets`, async ({ request }) => {
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
      addEmployeeTicket({
        title: String(body.title),
        description: String(body.description),
        categoryId: String(body.categoryId ?? "other"),
        priority: body.priority ?? "medium",
      }),
      { status: 201 },
    );
  }),
  http.get(`${API}/tickets/mine`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const cursor = url.searchParams.get("cursor");
    const all = listEmployeeTickets();
    const start = cursor ? Number(cursor) : 0;
    const items = all.slice(start, start + limit);
    const next = start + limit < all.length ? String(start + limit) : null;
    return HttpResponse.json({ items, nextCursor: next, counts: employeeCounts() });
  }),
  http.get(`${API}/tickets/mine/updates`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 5);
    return HttpResponse.json({ items: employeeUpdates(limit) });
  }),
  http.get(`${API}/tickets/mine/unrated`, () => HttpResponse.json({ items: unratedResolvedTickets() })),
  http.get(`${API}/tickets/:reference`, ({ params }) => {
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
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/tickets/:id/attachments/presign`, async ({ params, request }) => {
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
    const attachment = completeUpload(String(params.id), String(params.attachmentId));
    if (!attachment) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Upload not found." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(attachment);
  }),
  http.get(`${API}/attachments/:id/url`, ({ params }) =>
    // Relative so the popup stays same-origin under the worker's scope.
    HttpResponse.json({
      url: `/mock-files/${params.id}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    }),
  ),
  http.get(`${API}/mock-files/:id`, serveMockFile),
  // Same-origin variant for popups opened from the app origin.
  http.get(`*/mock-files/:id`, serveMockFile),
  http.post(`${API}/tickets/:id/csat`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { score?: number; comment?: string };
    const ok = rateTicket(String(params.id), Number(body.score ?? 0), String(body.comment ?? ""));
    if (!ok) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_FAILED", message: "Score must be 1–5 on a resolved ticket.", fieldErrors: { score: "Pick 1–5" } } },
        { status: 422 },
      );
    }
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),
  http.get(`${API}/desk/dashboard`, ({ request }) => {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") === "7" ? 7 : 30;
    return HttpResponse.json(deskDashboard(range));
  }),
  http.get(`${API}/desk/tickets`, ({ request }) => {
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
    try {
      const result = claimTicket(String(params.id));
      if (!result.ok) {
        return HttpResponse.json(
          { error: { code: "ALREADY_ASSIGNED", message: `Already taken by ${result.assignee.name}`, assignee: result.assignee } },
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
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const ticket = releaseTicket(String(params.id), body.reason);
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/desk/tickets/:id/assign`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { assigneeId?: string };
    const ticket = assignTicket(String(params.id), String(body.assigneeId ?? ""));
    if (!ticket) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket or agent not found." } },
        { status: 404 },
      );
    }
    return HttpResponse.json(ticket);
  }),
  http.post(`${API}/desk/tickets/:id/send`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
      status?: "open" | "in_progress" | "resolved";
      internal?: boolean;
      priority?: "low" | "medium" | "high" | "urgent";
      version?: number;
    };
    // Mock role travels on the session (same pattern as the desk store).
    const profile = getMockProfile();
    const role = profile?.role ?? "agent";
    const result = sendToTicket(String(params.id), { ...body, version: Number(body.version ?? -1) }, role);
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
    heartbeat(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/desk/agents`, () => HttpResponse.json(deskAgents())),
  http.get(`${API}/desk/activity`, () => HttpResponse.json({ items: deskActivity(), nextCursor: null })),
  http.get(`${API}/desk/events`, () => {
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
  http.get(`${API}/admin/dashboard`, () => HttpResponse.json({ cards: {}, widgets: {} })),
  http.get(`${API}/admin/agents`, () => HttpResponse.json(mockAgents)),
  http.post(`${API}/admin/agents`, async ({ request }) => {
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
    const agent = deactivateAgent(String(params.id));
    if (!agent) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(agent);
  }),
  http.get(`${API}/admin/audit`, () => HttpResponse.json({ items: [], nextCursor: null })),
];
