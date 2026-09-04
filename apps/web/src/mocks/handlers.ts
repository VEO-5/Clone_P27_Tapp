import { http, HttpResponse } from "msw";

import {
  addAgent,
  deactivateAgent,
  getMockProfile,
  makeTicket,
  makeTicketList,
  mockAgents,
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
  http.get(`${API}/desk/dashboard`, () =>
    HttpResponse.json({
      cards: { unassigned: 4, pending: 3, mine: 5, breachingSoon: 1 },
      series: { receivedVsResolved: [], byStatus: [], byCategory: [], ageBuckets: [] },
    }),
  ),
  http.get(`${API}/desk/tickets`, () =>
    HttpResponse.json({ items: makeTicketList(10), nextCursor: null }),
  ),
  http.get(`${API}/desk/tickets/:id`, ({ params }) =>
    HttpResponse.json({
      ...makeTicket({ id: String(params.id) }),
      events: [],
      messages: [],
      attachments: [],
    }),
  ),
  http.post(`${API}/desk/tickets/:id/claim`, ({ params }) =>
    HttpResponse.json(makeTicket({ id: String(params.id), status: "open" })),
  ),
  http.post(`${API}/desk/tickets/:id/release`, ({ params }) =>
    HttpResponse.json(makeTicket({ id: String(params.id), status: "pending" })),
  ),
  http.post(`${API}/desk/tickets/:id/send`, ({ params }) =>
    HttpResponse.json({
      ...makeTicket({ id: String(params.id), status: "open" }),
      events: [],
      messages: [],
      attachments: [],
    }),
  ),
  http.get(`${API}/desk/agents`, () => HttpResponse.json(mockAgents)),
  http.get(`${API}/desk/activity`, () => HttpResponse.json({ items: [], nextCursor: null })),
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
