import type { NextRequest } from "next/server";

import { isAuthenticated } from "@/lib/adminAuth";
import { ok, serverError, unauthorized } from "@/lib/http";
import { getRepository, type TicketFilter } from "@/lib/repo";
import { isTicketPriority, isTicketStatus } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/admin/tickets — the support queue, with optional filters.
 * Requires a valid support session; unauthenticated callers get a 401.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const filter: TicketFilter = {
    status: isTicketStatus(status) ? status : "all",
    priority: isTicketPriority(priority) ? priority : "all",
    search: searchParams.get("q") ?? undefined,
  };

  try {
    const repo = getRepository();
    const [tickets, stats] = await Promise.all([repo.listTickets(filter), repo.getStats()]);
    return ok({ tickets, stats });
  } catch (error) {
    return serverError("admin.tickets.list", error);
  }
}
