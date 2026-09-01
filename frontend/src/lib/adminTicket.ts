import type { TicketDetail, TicketPriority, TicketStatus } from "./types";

export interface AdminTicketPatch {
  status?: TicketStatus;
  priority?: TicketPriority;
  reply?: string;
}

export interface AdminTicketPatchResult {
  ticket: TicketDetail;
  emailSent: boolean;
}

export class AdminTicketPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTicketPatchError";
  }
}

/** Authenticated PATCH used by the desk queue and the ticket triage panel. */
export async function patchAdminTicket(
  id: string,
  body: AdminTicketPatch,
): Promise<AdminTicketPatchResult> {
  const response = await fetch(`/api/admin/tickets/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<AdminTicketPatchResult> & { error?: string })
    | null;

  if (!response.ok) {
    throw new AdminTicketPatchError(payload?.error ?? "Couldn't update this ticket.");
  }

  if (!payload?.ticket) {
    throw new AdminTicketPatchError("Couldn't update this ticket.");
  }

  return { ticket: payload.ticket, emailSent: Boolean(payload.emailSent) };
}
