import { http, HttpResponse } from "msw";

import { makeTicket, makeTicketList, mockAgents, mockProfile } from "./fixtures";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(mockProfile)),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/categories`, () =>
    HttpResponse.json([
      { id: "sphere_app", name: "Sphere app issue" },
      { id: "network", name: "Network / VPN" },
    ]),
  ),
  http.get(`${API}/known-issues`, () => HttpResponse.json([])),
  http.post(`${API}/tickets`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return HttpResponse.json(
      makeTicket({
        title: String(body.title ?? "New ticket"),
        description: String(body.description ?? "A detailed description of the Sphere issue."),
        categoryId: String(body.categoryId ?? "sphere_app"),
        status: "pending",
      }),
      { status: 201 },
    );
  }),
  http.get(`${API}/tickets/mine`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const items = makeTicketList(Math.min(limit, 20));
    return HttpResponse.json({
      items,
      nextCursor: null,
      counts: { pending: 2, open: 1, inProgress: 1, resolved: 1 },
    });
  }),
  http.get(`${API}/tickets/:reference`, ({ params }) =>
    HttpResponse.json(makeTicket({ reference: String(params.reference) })),
  ),
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
  http.get(`${API}/admin/audit`, () => HttpResponse.json({ items: [], nextCursor: null })),
];
