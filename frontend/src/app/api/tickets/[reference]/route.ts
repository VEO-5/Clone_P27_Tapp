import type { NextRequest } from "next/server";

import { notFound, ok, serverError } from "@/lib/http";
import { normaliseReference } from "@/lib/reference";
import { getRepository } from "@/lib/repo";

export const runtime = "nodejs";

/** GET /api/tickets/[reference] — a single ticket with attachments and timeline. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  try {
    const ticket = await getRepository().getTicketByReference(normaliseReference(reference));
    if (!ticket) return notFound("No ticket found for that reference");
    return ok({ ticket });
  } catch (error) {
    return serverError("tickets.get", error);
  }
}
