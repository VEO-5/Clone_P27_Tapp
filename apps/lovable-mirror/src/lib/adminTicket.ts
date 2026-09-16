import { apiFetch } from "./api";
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

/**
 * Phase 0 stub: talks to the NestJS API via the typed client.
 * Full composer/locking semantics land in Phase 4.
 */
export async function patchAdminTicket(
  id: string,
  body: AdminTicketPatch,
): Promise<AdminTicketPatchResult> {
  try {
    const ticket = await apiFetch<TicketDetail>(`/desk/tickets/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ ...body, version: 0 }),
    });
    return { ticket, emailSent: false };
  } catch (error) {
    if (error instanceof Error) throw new AdminTicketPatchError(error.message);
    throw new AdminTicketPatchError("Couldn't update this ticket.");
  }
}
