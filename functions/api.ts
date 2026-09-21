/**
 * pearl27-ticketing API — single Edge Function router.
 *
 * All browser data access goes through here. The function authenticates the
 * caller via their InsForge access token (Authorization: Bearer), resolves
 * their profile/role from public.profiles, enforces the same gates as the
 * MSW reference (401 signed-out, 403 wrong role, 409 version/assignment
 * conflicts, 422 validation), and talks to Postgres with the admin key
 * (RLS denies anon/authenticated direct access by design).
 *
 * Routed by `?path=/...` so the frontend keeps its REST surface unchanged:
 *   {INSFORGE_URL}/functions/api?path=/tickets/mine&limit=20
 *
 * Error envelope mirrors the app contract:
 *   { error: { code, message, fieldErrors? , ...details } }
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk@1.5.2";

const BASE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";
const API_KEY =
  Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allow =
    ALLOWED_ORIGINS.length === 0
      ? "*"
      : ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

function err(
  req: Request,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return json(req, { error: { code, message, ...(extra ?? {}) } }, status);
}

const UNAUTH = (req: Request) =>
  err(req, 401, "UNAUTHENTICATED", "Sign in again to continue.");
const FORBIDDEN = (req: Request) =>
  err(req, 403, "FORBIDDEN", "You can't open this screen.");

// ---------------------------------------------------------------------------
// Shapes (DB snake_case -> contract camelCase)
// ---------------------------------------------------------------------------

interface DbProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "employee" | "agent" | "admin";
  team_id: string | null;
}

interface DbTicket {
  id: string;
  reference: string;
  title: string;
  description: string;
  category_id: string;
  status: string;
  priority: string;
  requester_id: string;
  assignee_id: string | null;
  version: number;
  chat_dm_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function toTicket(t: DbTicket) {
  return {
    id: t.id,
    reference: t.reference,
    title: t.title,
    description: t.description,
    categoryId: t.category_id,
    status: t.status,
    priority: t.priority,
    requesterId: t.requester_id,
    assigneeId: t.assignee_id,
    version: t.version,
    chatDmUrl: t.chat_dm_url,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function toProfile(p: DbProfile) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    avatarUrl: p.avatar_url,
    role: p.role,
    teamId: p.team_id,
  };
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newReference(): string {
  let s = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `PRL-${s}`;
}

const STATUSES = ["pending", "open", "in_progress", "resolved"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const SEND_STATUSES = ["open", "in_progress", "resolved"] as const;

function roleRank(role: string): number {
  return role === "admin" ? 2 : role === "agent" ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req) });
  }

  if (!BASE_URL || !API_KEY) {
    return err(
      req,
      500,
      "MISCONFIGURED",
      "Function secrets missing (INSFORGE_BASE_URL / API_KEY).",
    );
  }

  const url = new URL(req.url);
  // Routed by ?path= (compat proxy) or by trailing pathname on subhosting.
  let path = url.searchParams.get("path") ?? "";
  if (!path) {
    const m = url.pathname.match(/\/api\/?(.*)$/);
    path = m ? `/${m[1]}` : "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // The frontend encodes the full REST path (including its query string)
  // into ?path= — fold it back into top-level params the handlers read.
  const qIndex = path.indexOf("?");
  const params = url.searchParams;
  if (qIndex >= 0) {
    const extra = new URLSearchParams(path.slice(qIndex + 1));
    for (const [k, v] of extra) {
      if (!params.has(k)) params.append(k, v);
    }
    path = path.slice(0, qIndex);
  }

  let body: Record<string, unknown> = {};
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  const admin = createAdminClient({ baseUrl: BASE_URL, apiKey: API_KEY });

  // -- public routes (no session) -------------------------------------------
  if (req.method === "GET" && path === "/categories") {
    const { data, error } = await admin.database
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) return err(req, 500, "DB_ERROR", "Couldn't load categories.");
    return json(
      req,
      (data as { id: string; name: string }[]).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    );
  }

  if (req.method === "GET" && path === "/known-issues") {
    const { data, error } = await admin.database
      .from("known_issues")
      .select("id, title, message")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return err(req, 500, "DB_ERROR", "Couldn't load notices.");
    return json(req, data ?? []);
  }

  // -- session ---------------------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return UNAUTH(req);

  const me = createClient({ baseUrl: BASE_URL, accessToken: token });
  const { data: userData, error: userError } = await me.auth.getCurrentUser();
  const user = userData?.user as
    | { id: string; email?: string; profile?: Record<string, unknown> }
    | null
    | undefined;
  if (userError || !user?.id) return UNAUTH(req);

  async function profile(): Promise<DbProfile | null> {
    // deno-lint-ignore no-explicit-any
    const db = admin.database as any;
    const { data } = await db
      .from("profiles")
      .select("id, email, name, avatar_url, role, team_id")
      .eq("id", user!.id)
      .maybeSingle();
    if (data) return data as DbProfile;
    // Auto-provision on first login. Work domain only (matches /auth/resolve).
    const email = String(user!.email ?? "").toLowerCase();
    if (!email.endsWith("@pearl27.com")) {
      return null;
    }
    const name =
      String(user!.profile?.["name"] ?? "") || email.split("@")[0];
    const { data: created } = await db
      .from("profiles")
      .insert([{ id: user!.id, email, name, role: "employee" }])
      .select("id, email, name, avatar_url, role, team_id")
      .single();
    return (created as DbProfile) ?? null;
  }

  // GET /auth/me
  if (req.method === "GET" && path === "/auth/me") {
    const p = await profile();
    if (!p) {
      const email = String(user.email ?? "").toLowerCase();
      if (email && !email.endsWith("@pearl27.com")) {
        return err(
          req,
          422,
          "INVALID_EMAIL",
          "Use your @pearl27.com work email.",
        );
      }
      return UNAUTH(req);
    }
    return json(req, toProfile(p));
  }

  // Every route below needs a provisioned profile.
  const p = await profile();
  if (!p) {
    const email = String(user.email ?? "").toLowerCase();
    if (email && !email.endsWith("@pearl27.com")) {
      return err(req, 422, "INVALID_EMAIL", "Use your @pearl27.com work email.");
    }
    return UNAUTH(req);
  }
  const isDesk = roleRank(p.role) >= 1;
  const isAdmin = p.role === "admin";

  // deno-lint-ignore no-explicit-any
  const db = admin.database as any;

  async function ticketById(id: string): Promise<DbTicket | null> {
    const { data } = await db
      .from("tickets")
      .select(
        "id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at",
      )
      .eq("id", id)
      .maybeSingle();
    return (data as DbTicket) ?? null;
  }

  // -- POST /tickets ----------------------------------------------------------
  if (req.method === "POST" && path === "/tickets") {
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();
    const priority = String(body.priority ?? "medium");
    const fieldErrors: Record<string, string> = {};
    if (title.length < 5) {
      fieldErrors.title =
        "Give your issue a short title (at least 5 characters)";
    }
    if (title.length > 140) fieldErrors.title = "Title must be 140 characters or fewer";
    if (description.length < 20) {
      fieldErrors.description =
        "Describe the issue in at least 20 characters so support can help";
    }
    if (description.length > 5000) {
      fieldErrors.description = "Description must be 5000 characters or fewer";
    }
    if (!categoryId) fieldErrors.categoryId = "Choose a category";
    if (!(PRIORITIES as readonly string[]).includes(priority)) {
      fieldErrors.priority = "Pick a valid priority";
    }
    if (Object.keys(fieldErrors).length > 0) {
      return err(req, 422, "VALIDATION_FAILED", "Check the highlighted fields.", {
        fieldErrors,
      });
    }
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();
    if (!cat) {
      return err(req, 422, "VALIDATION_FAILED", "Check the highlighted fields.", {
        fieldErrors: { categoryId: "Choose a valid category" },
      });
    }
    let ticket: DbTicket | null = null;
    for (let attempt = 0; attempt < 3 && !ticket; attempt++) {
      const { data, error } = await db
        .from("tickets")
        .insert([
          {
            reference: newReference(),
            title,
            description,
            category_id: categoryId,
            priority,
            status: "open",
            requester_id: p.id,
          },
        ])
        .select(
          "id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at",
        )
        .single();
      if (!error) ticket = data as DbTicket;
    }
    if (!ticket) return err(req, 500, "DB_ERROR", "Couldn't create the ticket.");
    await db.from("ticket_events").insert([
      {
        ticket_id: ticket.id,
        type: "created",
        message: `Ticket ${ticket.reference} created`,
        actor: "employee",
      },
    ]);
    return json(req, toTicket(ticket), 201);
  }

  // -- GET /tickets/mine -------------------------------------------------------
  if (req.method === "GET" && path === "/tickets/mine") {
    const limit = Math.min(
      Math.max(Number(params.get("limit") ?? 20), 1),
      50,
    );
    const cursor = Number(params.get("cursor") ?? 0) || 0;
    const { data, error } = await db
      .from("tickets")
      .select(
        "id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at",
      )
      .eq("requester_id", p.id)
      .order("created_at", { ascending: false })
      .range(cursor, cursor + limit - 1);
    if (error) return err(req, 500, "DB_ERROR", "Couldn't load tickets.");
    const rows = (data as DbTicket[]) ?? [];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return json(req, {
      items: rows.map(toTicket),
      nextCursor: rows.length === limit ? String(cursor + limit) : null,
      counts,
    });
  }

  // -- GET /tickets/:reference --------------------------------------------------
  {
    const m = path.match(/^\/tickets\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const reference = decodeURIComponent(m[1]);
      const { data } = await db
        .from("tickets")
        .select(
          "id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at",
        )
        .eq("reference", reference)
        .maybeSingle();
      const t = (data as DbTicket) ?? null;
      if (!t) return err(req, 404, "NOT_FOUND", "No ticket found with that reference.");
      if (t.requester_id !== p.id && !isDesk) {
        return err(req, 404, "NOT_FOUND", "No ticket found with that reference.");
      }
      return json(req, toTicket(t));
    }
  }

  // Desk + admin routes need desk role from here on.
  const needsDesk =
    path.startsWith("/desk/") || path.startsWith("/admin/");
  if (needsDesk && !isDesk) return FORBIDDEN(req);

  // -- GET /desk/dashboard ------------------------------------------------------
  if (req.method === "GET" && path === "/desk/dashboard") {
    const { data: all } = await db
      .from("tickets")
      .select("id, status, priority, category_id, assignee_id, requester_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (all as {
      id: string;
      status: string;
      priority: string;
      category_id: string;
      assignee_id: string | null;
      requester_id: string;
      created_at: string;
    }[]) ?? [];
    const day = 86_400_000;
    const now = Date.now();
    const unassigned = rows.filter((r) => !r.assignee_id && r.status !== "resolved").length;
    const mine = rows.filter((r) => r.assignee_id === p.id && r.status !== "resolved").length;
    const receivedToday = rows.filter((r) => now - Date.parse(r.created_at) < day).length;
    const receivedWeek = rows.filter((r) => now - Date.parse(r.created_at) < 7 * day).length;
    const byStatus = STATUSES.map((status) => ({
      status,
      count: rows.filter((r) => r.status === status).length,
    }));
    const catIds = [...new Set(rows.map((r) => r.category_id))];
    const { data: cats } = await db.from("categories").select("id, name");
    const catName = new Map(
      ((cats as { id: string; name: string }[]) ?? []).map((c) => [c.id, c.name]),
    );
    const byCategory = catIds.map((categoryId) => ({
      categoryId,
      categoryName: catName.get(categoryId) ?? categoryId,
      count: rows.filter((r) => r.category_id === categoryId).length,
    }));
    const receivedVsResolved = [...Array(7)].map((_, i) => {
      const d = new Date(now - (6 - i) * day);
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        received: rows.filter((r) => r.created_at.slice(0, 10) === key).length,
        resolved: 0,
      };
    });
    return json(req, {
      cards: {
        unassigned,
        pending: rows.filter((r) => r.status === "pending").length,
        mine,
        breachingSoon: 0,
        receivedToday,
        receivedWeek,
        resolvedByMeToday: 0,
        resolvedByMeWeek: 0,
        myAvgResolutionHours: null,
      },
      series: { receivedVsResolved, byStatus, byCategory, ageBuckets: [] },
    });
  }

  // -- GET /desk/tickets ---------------------------------------------------------
  if (req.method === "GET" && path === "/desk/tickets") {
    const tab = params.get("tab") ?? "mine";
    const limit = Math.min(Math.max(Number(params.get("limit") ?? 10), 1), 50);
    const cursor = Number(params.get("cursor") ?? 0) || 0;
    let q = db
      .from("tickets")
      .select(
        "id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at",
      );
    if (tab === "mine") q = q.eq("assignee_id", p.id);
    else if (tab === "unassigned") q = q.is("assignee_id", null);
    const assigneeId = params.get("assigneeId");
    if (assigneeId) q = q.eq("assignee_id", assigneeId);
    for (const key of ["status", "priority"] as const) {
      const v = params.get(key);
      if (v) q = q.eq(key, v);
    }
    const categoryId = params.get("categoryId");
    if (categoryId) q = q.eq("category_id", categoryId);
    const search = params.get("q");
    if (search) q = q.ilike("title", `%${search}%`);
    const sort = params.get("sort");
    q = q.order("created_at", { ascending: sort === "oldest" });
    const { data, error } = await q.range(cursor, cursor + limit - 1);
    if (error) return err(req, 500, "DB_ERROR", "Couldn't load the queue.");
    const rows = (data as DbTicket[]) ?? [];
    return json(req, {
      items: rows.map(toTicket),
      nextCursor: rows.length === limit ? String(cursor + limit) : null,
    });
  }

  // -- GET /desk/tickets/:id (detail) ----------------------------------------------
  {
    const m = path.match(/^\/desk\/tickets\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const t = await ticketById(decodeURIComponent(m[1]));
      if (!t) return err(req, 404, "NOT_FOUND", "Ticket not found.");
      const [{ data: events }, { data: messages }, { data: attachments }] =
        await Promise.all([
          db.from("ticket_events").select("id, ticket_id, type, message, actor, created_at").eq("ticket_id", t.id).order("created_at", { ascending: true }).limit(100),
          db.from("messages").select("id, ticket_id, author_role, text, created_at").eq("ticket_id", t.id).order("created_at", { ascending: true }).limit(100),
          db.from("attachments").select("id, ticket_id, file_name, mime_type, size_bytes, created_at").eq("ticket_id", t.id).limit(20),
        ]);
      return json(req, {
        ...toTicket(t),
        events: ((events ?? []) as Record<string, unknown>[]).map((e) => ({
          id: e["id"], ticketId: e["ticket_id"], type: e["type"], message: e["message"], actor: e["actor"], createdAt: e["created_at"],
        })),
        messages: ((messages ?? []) as Record<string, unknown>[]).map((msg) => ({
          id: msg["id"], ticketId: msg["ticket_id"], authorRole: msg["author_role"], text: msg["text"], createdAt: msg["created_at"],
        })),
        attachments: ((attachments ?? []) as Record<string, unknown>[]).map((a) => ({
          id: a["id"], ticketId: a["ticket_id"], fileName: a["file_name"], mimeType: a["mime_type"], sizeBytes: a["size_bytes"], createdAt: a["created_at"],
        })),
      });
    }
  }

  async function assigneeName(id: string | null): Promise<string | null> {
    if (!id) return null;
    const { data } = await db.from("profiles").select("name").eq("id", id).maybeSingle();
    return (data as { name: string } | null)?.name ?? null;
  }

  // -- POST /desk/tickets/:id/claim -------------------------------------------------
  {
    const m = path.match(/^\/desk\/tickets\/([^/]+)\/claim$/);
    if (req.method === "POST" && m) {
      const t = await ticketById(decodeURIComponent(m[1]));
      if (!t) return err(req, 404, "NOT_FOUND", "Ticket not found.");
      if (t.status === "resolved") {
        return err(req, 422, "RESOLVED", "This ticket is resolved. Change status to reopen it.");
      }
      if (t.assignee_id && t.assignee_id !== p.id) {
        const owner = (await assigneeName(t.assignee_id)) ?? "another agent";
        return err(req, 409, "ALREADY_ASSIGNED", `Already taken by ${owner}.`, {
          assignee: { id: t.assignee_id, name: owner },
        });
      }
      const { data, error } = await db
        .from("tickets")
        .update({ assignee_id: p.id, version: t.version + 1 })
        .eq("id", t.id)
        .select("id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at")
        .single();
      if (error || !data) return err(req, 500, "DB_ERROR", "Couldn't claim the ticket.");
      await db.from("ticket_events").insert([{
        ticket_id: t.id, type: "assigned", message: `${p.name} claimed the ticket`, actor: "support",
      }]);
      return json(req, toTicket(data as DbTicket));
    }
  }

  // -- POST /desk/tickets/:id/release ------------------------------------------------
  {
    const m = path.match(/^\/desk\/tickets\/([^/]+)\/release$/);
    if (req.method === "POST" && m) {
      const t = await ticketById(decodeURIComponent(m[1]));
      if (!t) return err(req, 404, "NOT_FOUND", "Ticket not found.");
      if (!t.assignee_id) {
        return err(req, 422, "VALIDATION_FAILED", "There's nothing to release — this ticket is unassigned.");
      }
      if (t.assignee_id !== p.id && !isAdmin) {
        const owner = (await assigneeName(t.assignee_id)) ?? "another agent";
        return err(req, 403, "FORBIDDEN", `Locked to ${owner} · view only`);
      }
      const reason = String(body.reason ?? "");
      if (reason.length > 500) {
        return err(req, 422, "VALIDATION_FAILED", "Keep the reason under 500 characters.", {
          fieldErrors: { reason: "Keep it under 500 characters" },
        });
      }
      const { data, error } = await db
        .from("tickets")
        .update({ assignee_id: null, version: t.version + 1 })
        .eq("id", t.id)
        .select("id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at")
        .single();
      if (error || !data) return err(req, 500, "DB_ERROR", "Couldn't release the ticket.");
      await db.from("ticket_events").insert([{
        ticket_id: t.id, type: "released",
        message: reason ? `${p.name} released the ticket — ${reason}` : `${p.name} released the ticket`,
        actor: "support",
      }]);
      return json(req, toTicket(data as DbTicket));
    }
  }

  // -- POST /desk/tickets/:id/assign (admin only) --------------------------------------
  {
    const m = path.match(/^\/desk\/tickets\/([^/]+)\/assign$/);
    if (req.method === "POST" && m) {
      if (!isAdmin) return FORBIDDEN(req);
      const t = await ticketById(decodeURIComponent(m[1]));
      if (!t) return err(req, 404, "NOT_FOUND", "Ticket not found.");
      if (t.status === "resolved") {
        return err(req, 422, "RESOLVED", "This ticket is resolved. Change status to reopen it.");
      }
      const assigneeId = String(body.assigneeId ?? "").trim();
      if (!assigneeId) {
        return err(req, 422, "VALIDATION_FAILED", "Pick an agent.", {
          fieldErrors: { assigneeId: "Choose an agent" },
        });
      }
      const { data: agent } = await db.from("profiles").select("id, role").eq("id", assigneeId).maybeSingle();
      const a = agent as { id: string; role: string } | null;
      if (!a || roleRank(a.role) < 1) {
        return err(req, 404, "NOT_FOUND", "Ticket or agent not found.");
      }
      const { data, error } = await db
        .from("tickets")
        .update({ assignee_id: assigneeId, version: t.version + 1 })
        .eq("id", t.id)
        .select("id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at")
        .single();
      if (error || !data) return err(req, 500, "DB_ERROR", "Couldn't assign the ticket.");
      await db.from("ticket_events").insert([{
        ticket_id: t.id, type: "assigned", message: `${p.name} assigned the ticket`, actor: "support",
      }]);
      return json(req, toTicket(data as DbTicket));
    }
  }

  // -- POST /desk/tickets/:id/send -------------------------------------------------------
  {
    const m = path.match(/^\/desk\/tickets\/([^/]+)\/send$/);
    if (req.method === "POST" && m) {
      const t = await ticketById(decodeURIComponent(m[1]));
      if (!t) return err(req, 404, "NOT_FOUND", "Ticket not found.");
      if (t.assignee_id && t.assignee_id !== p.id && !isAdmin) {
        const owner = (await assigneeName(t.assignee_id)) ?? "another agent";
        return err(req, 403, "LOCKED_BY_OTHER", `Locked to ${owner} · view only`, {
          ownerName: owner,
        });
      }
      const version = Number(body.version ?? NaN);
      if (!Number.isInteger(version)) {
        return err(req, 422, "VALIDATION_FAILED", "Provide a message, status, or priority");
      }
      if (version !== t.version) {
        return err(req, 409, "VERSION_CONFLICT", "This ticket changed while you were typing.", {
          detail: { currentVersion: t.version },
        });
      }
      const text = typeof body.text === "string" ? body.text.trim() : "";
      const status = typeof body.status === "string" ? body.status : undefined;
      const priority = typeof body.priority === "string" ? body.priority : undefined;
      const internal = body.internal === true;
      if (!text && !status && !priority) {
        return err(req, 422, "VALIDATION_FAILED", "Provide a message, status, or priority");
      }
      if (text && (text.length < 1 || text.length > 5000)) {
        return err(req, 422, "VALIDATION_FAILED", "Message must be 1–5000 characters.");
      }
      if (status && !(SEND_STATUSES as readonly string[]).includes(status)) {
        return err(req, 422, "VALIDATION_FAILED", "Invalid status.");
      }
      if (priority && !(PRIORITIES as readonly string[]).includes(priority)) {
        return err(req, 422, "VALIDATION_FAILED", "Invalid priority.");
      }
      const patch: Record<string, unknown> = { version: t.version + 1 };
      if (status) {
        patch["status"] = status;
        patch["resolved_at"] = status === "resolved" ? new Date().toISOString() : null;
      }
      if (priority) patch["priority"] = priority;
      // Claim-on-reply: an unassigned ticket touched by an agent locks to them.
      if (!t.assignee_id) patch["assignee_id"] = p.id;
      const { data: updated, error: upError } = await db
        .from("tickets")
        .update(patch)
        .eq("id", t.id)
        .select("id, reference, title, description, category_id, status, priority, requester_id, assignee_id, version, chat_dm_url, created_at, updated_at, resolved_at")
        .single();
      if (upError || !updated) return err(req, 500, "DB_ERROR", "Couldn't update the ticket.");
      if (text) {
        await db.from("messages").insert([{
          ticket_id: t.id, author_role: "agent", author_id: p.id, text, internal,
        }]);
        await db.from("ticket_events").insert([{
          ticket_id: t.id, type: internal ? "internal_note" : "message",
          message: internal ? "Internal note added" : "Agent replied", actor: "support",
        }]);
      }
      if (status && status !== t.status) {
        await db.from("ticket_events").insert([{
          ticket_id: t.id, type: status === "resolved" ? "resolved" : "status_changed",
          message: `Status changed to ${status}`, actor: "support",
        }]);
      }
      return json(req, toTicket(updated as DbTicket));
    }
  }

  // -- GET /desk/agents + /desk/activity + /desk/canned-responses ---------------------------
  if (req.method === "GET" && path === "/desk/agents") {
    const { data } = await db.from("profiles").select("id, name, avatar_url").in("role", ["agent", "admin"]).order("name", { ascending: true }).limit(100);
    return json(req, ((data ?? []) as { id: string; name: string; avatar_url: string | null }[]).map((a) => ({
      id: a.id, name: a.name, avatarUrl: a.avatar_url,
    })));
  }

  if (req.method === "GET" && path === "/desk/activity") {
    const { data } = await db.from("ticket_events").select("id, ticket_id, type, message, actor, created_at").order("created_at", { ascending: false }).limit(20);
    const events = (data as { id: string; ticket_id: string; type: string; message: string | null; actor: string; created_at: string }[] | null) ?? [];
    const ids = [...new Set(events.map((e) => e.ticket_id))];
    let refById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: ts } = await db.from("tickets").select("id, reference").in("id", ids);
      refById = new Map(((ts ?? []) as { id: string; reference: string }[]).map((t) => [t.id, t.reference]));
    }
    return json(req, {
      items: events.map((e) => ({
        id: e.id,
        kind: e.type === "message" ? "message" : e.type === "assigned" ? "assigned" : e.type === "released" ? "released" : "status_changed",
        ticketId: e.ticket_id,
        ticketReference: refById.get(e.ticket_id) ?? "",
        text: e.message ?? "",
        actorName: e.actor,
        createdAt: e.created_at,
      })),
      nextCursor: null,
    });
  }

  if (req.method === "GET" && path === "/desk/canned-responses") {
    const { data } = await db.from("canned_responses").select("id, shortcut, title, body").order("title", { ascending: true }).limit(50);
    return json(req, data ?? []);
  }

  return err(req, 404, "NOT_FOUND", "Unknown endpoint.");
}
