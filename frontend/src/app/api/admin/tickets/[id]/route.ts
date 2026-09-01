import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { isAuthenticated } from "@/lib/adminAuth";
import { sendTicketResolvedEmail } from "@/lib/email";
import { notFound, ok, serverError, unauthorized, validationFailed } from "@/lib/http";
import { getRepository } from "@/lib/repo";
import { updateTicketSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/tickets/[id] — change status/priority and/or post a reply.
 *
 * Moving a ticket to `resolved` also stamps `resolved_at` and emails the
 * employee. The email is awaited only so we can report whether it was sent; a
 * failure is logged and never blocks the update.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;

  try {
    const parsed = updateTicketSchema.safeParse(await request.json());
    if (!parsed.success) return validationFailed(parsed.error);

    const result = await getRepository().updateTicket(id, parsed.data);
    if (!result) return notFound("Ticket not found");

    let emailSent = false;
    if (result.notifyResolved) {
      const outcome = await sendTicketResolvedEmail(result.ticket, parsed.data.reply);
      emailSent = outcome.sent;
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/tickets/${id}`);
    revalidatePath("/my-tickets");
    revalidatePath("/track");
    revalidatePath(`/track/${result.ticket.reference}`);

    return ok({ ticket: result.ticket, emailSent });
  } catch (error) {
    return serverError("admin.tickets.update", error);
  }
}

/** GET /api/admin/tickets/[id] — full ticket detail for the dashboard. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;

  try {
    const ticket = await getRepository().getTicketById(id);
    if (!ticket) return notFound("Ticket not found");
    return ok({ ticket });
  } catch (error) {
    return serverError("admin.tickets.get", error);
  }
}
