import type { Ticket, TicketDetail, TicketStats, TicketStatus, TicketPriority } from "../types";
import type { CreateTicketInput, UpdateTicketInput } from "../validation";

export interface UploadFile {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}

export interface TicketFilter {
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  search?: string;
}

export interface UpdateResult {
  ticket: TicketDetail;
  notifyResolved: boolean;
}

export interface AttachmentTarget {
  fileName: string;
  mimeType: string;
  /** Set for Supabase storage — a short-lived signed URL to redirect to. */
  signedUrl?: string;
  /** Set for the local fallback store — raw bytes to stream back. */
  bytes?: Buffer;
}

/**
 * Storage contract shared by the Supabase implementation and the local
 * file-backed fallback, so route handlers and pages never care which is live.
 */
export interface TicketRepository {
  readonly kind: "supabase" | "local";

  createTicket(input: CreateTicketInput, files: UploadFile[]): Promise<TicketDetail>;
  getTicketByReference(reference: string): Promise<TicketDetail | null>;
  getTicketById(id: string): Promise<TicketDetail | null>;
  listTicketsByEmail(email: string): Promise<Ticket[]>;
  listTickets(filter?: TicketFilter): Promise<Ticket[]>;
  updateTicket(id: string, input: UpdateTicketInput): Promise<UpdateResult | null>;
  getStats(): Promise<TicketStats>;
  resolveAttachment(id: string): Promise<AttachmentTarget | null>;
}

export function computeStats(tickets: readonly Ticket[]): TicketStats {
  return {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    total: tickets.length,
  };
}

export function matchesFilter(ticket: Ticket, filter: TicketFilter | undefined): boolean {
  if (!filter) return true;
  if (filter.status && filter.status !== "all" && ticket.status !== filter.status) return false;
  if (filter.priority && filter.priority !== "all" && ticket.priority !== filter.priority) return false;

  const search = filter.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      ticket.reference,
      ticket.employeeName,
      ticket.employeeEmail,
      ticket.title,
      ticket.description,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}
