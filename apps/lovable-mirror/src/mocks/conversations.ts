import type { Attachment, Message, TicketEvent } from "@pearl27/contracts";

import { getMockProfile } from "./fixtures";
import { listDeskTickets, ME, mutableDeskTicket, openAsAssignee } from "./desk";

// ---------------------------------------------------------------------------
// Conversation store (Phase 4): messages, events, notes per desk ticket.
// The send() flow implements the §6.11 routing outcomes the UI reflects.
// ---------------------------------------------------------------------------

interface Conversation {
  messages: Message[];
  events: TicketEvent[];
  attachments: Attachment[];
}

const HOURS = 3_600_000;
const NOW = Date.now();
const iso = (agoHours: number) => new Date(NOW - agoHours * HOURS).toISOString();

function seed(): Record<string, Conversation> {
  return {
    "t-desk-1": {
      messages: [
        { id: "dm-1", ticketId: "t-desk-1", authorRole: "employee", text: "Hi, the VPN just dropped again — third time today.", createdAt: iso(6) },
        { id: "dm-2", ticketId: "t-desk-1", authorRole: "agent", text: "Thanks Ada, I'm looking into the VPN drops now. Can you share your client version?", createdAt: iso(5) },
        { id: "dm-3", ticketId: "t-desk-1", authorRole: "employee", text: "It's 4.2.1 on Windows 11. Just dropped again at 10:40.", createdAt: iso(4) },
      ],
      events: [
        { id: "de-1", ticketId: "t-desk-1", type: "created", actor: "employee", createdAt: iso(30) },
        { id: "de-2", ticketId: "t-desk-1", type: "assigned", actor: "system", message: "Assigned to Kofi Mensah", createdAt: iso(29) },
        { id: "de-3", ticketId: "t-desk-1", type: "status_changed", actor: "agent", message: "Kofi opened your ticket", createdAt: iso(29) },
        { id: "de-4", ticketId: "t-desk-1", type: "internal_note", actor: "agent", message: "Checking gateway logs for this subnet", createdAt: iso(5) },
      ],
      attachments: [
        { id: "da-1", ticketId: "t-desk-1", fileName: "vpn-error.png", mimeType: "image/png", sizeBytes: 184_320, status: "available", createdAt: iso(30) },
      ],
    },
    "t-desk-7": {
      messages: [
        { id: "dm-7a", ticketId: "t-desk-7", authorRole: "employee", text: "The shared drive still shows access denied for the finance folder.", createdAt: iso(20) },
        { id: "dm-7b", ticketId: "t-desk-7", authorRole: "agent", text: "On it — checking the group membership now.", createdAt: iso(18) },
      ],
      events: [
        { id: "de-7a", ticketId: "t-desk-7", type: "created", actor: "employee", createdAt: iso(90) },
        { id: "de-7b", ticketId: "t-desk-7", type: "status_changed", actor: "agent", message: "Ada set In progress · Verifying group membership", createdAt: iso(80) },
        { id: "de-7c", ticketId: "t-desk-7", type: "internal_note", actor: "agent", message: "Waiting on IT security for the group change", createdAt: iso(70) },
      ],
      attachments: [],
    },
  };
}

let conversations: Record<string, Conversation> = seed();

export function resetConversations() {
  conversations = seed();
}

function conversationFor(id: string): Conversation {
  let convo = conversations[id];
  if (!convo) {
    convo = {
      messages: [],
      events: [{ id: `de-${id}-created`, ticketId: id, type: "created", actor: "employee", createdAt: iso(48) }],
      attachments: [],
    };
    conversations[id] = convo;
  }
  return convo;
}

export interface DeskDetail {
  ticket: ReturnType<typeof listDeskTickets>[number];
  events: TicketEvent[];
  messages: Message[];
  attachments: Attachment[];
  /** True when this fetch flipped Pending → Open for the assignee. */
  justOpened: boolean;
}

/** Full detail. Fetching as the assignee flips Pending → Open server-side. */
export function getDeskDetail(id: string): DeskDetail | { error: "NOT_FOUND" } {
  const viewer = getMockProfile()?.id ?? ME;
  const opened = openAsAssignee(id, viewer);
  if (!opened) return { error: "NOT_FOUND" };
  const convo = conversationFor(id);
  return {
    ticket: opened.ticket,
    events: convo.events,
    messages: convo.messages,
    attachments: convo.attachments,
    justOpened: opened.justOpened,
  };
}

export interface SendBody {
  text?: string;
  status?: "open" | "in_progress" | "resolved";
  internal?: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  version: number;
}

export type SendResult =
  | { ok: true; detail: DeskDetail; autoClaimed: boolean }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "LOCKED_BY_OTHER"; ownerName: string }
  | { ok: false; code: "VERSION_CONFLICT"; detail: DeskDetail }
  | { ok: false; code: "VALIDATION_FAILED"; message: string };

/** The composer mutation with §6.11 routing outcomes. */
export function sendToTicket(id: string, body: SendBody, role: string): SendResult {
  const stored = mutableDeskTicket(id);
  if (!stored) return { ok: false, code: "NOT_FOUND" };
  const viewer = getMockProfile();
  const viewerId = viewer?.id ?? ME;
  const viewerName = viewer?.name ?? "Kofi Mensah";

  const lockedByOther = Boolean(stored.assignee && stored.assignee.id !== viewerId);
  if (lockedByOther && role !== "admin") {
    return { ok: false, code: "LOCKED_BY_OTHER", ownerName: stored.assignee!.name };
  }
  if (body.version !== stored.version) {
    return { ok: false, code: "VERSION_CONFLICT", detail: getDeskDetail(id) as DeskDetail };
  }
  const text = body.text?.trim() ?? "";
  if (!text && !body.status && !body.priority) {
    return { ok: false, code: "VALIDATION_FAILED", message: "Provide a message, status, or priority" };
  }

  // Sending to an unassigned ticket auto-claims it (EA §6.6).
  let autoClaimed = false;
  if (!stored.assignee) {
    stored.assignee = { id: viewerId, name: viewerName, avatarUrl: null };
    stored.assigneeId = viewerId;
    if (stored.status === "pending") stored.status = "open";
    autoClaimed = true;
  }

  const now = new Date().toISOString();
  const convo = conversationFor(id);

  if (body.internal && text) {
    // Internal notes never touch status and never reach the employee.
    convo.events.push({ id: `de-${Date.now()}`, ticketId: id, type: "internal_note", actor: "agent", message: text, createdAt: now });
  } else if (body.status && text) {
    // Text + status renders as ONE status event with the text as its note.
    stored.status = body.status;
    convo.events.push({ id: `de-${Date.now()}`, ticketId: id, type: "status_changed", actor: "agent", message: `${viewerName} set ${statusLabel(body.status)} · ${text}`, createdAt: now });
  } else if (body.status) {
    stored.status = body.status;
    convo.events.push({ id: `de-${Date.now()}`, ticketId: id, type: "status_changed", actor: "agent", message: `${viewerName} set ${statusLabel(body.status)}`, createdAt: now });
  } else if (text) {
    // Text-only send renders as a message, not a timeline event.
    convo.messages.push({ id: `dm-${Date.now()}`, ticketId: id, authorRole: "agent", text, createdAt: now });
  }
  if (body.priority) stored.priority = body.priority;

  stored.version += 1;
  stored.updatedAt = now;
  const detail = getDeskDetail(id) as DeskDetail;
  return { ok: true, detail, autoClaimed };
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  return status[0]!.toUpperCase() + status.slice(1);
}

/** Presence heartbeat — recorded, always 204. */
const viewers = new Map<string, string[]>();

export function heartbeat(ticketId: string): void {
  const viewer = getMockProfile()?.name ?? "Kofi Mensah";
  const current = viewers.get(ticketId) ?? [];
  if (!current.includes(viewer)) viewers.set(ticketId, [...current, viewer]);
}

export function resetPresence() {
  viewers.clear();
}

/**
 * Idempotent live employee message for the SSE mock (FE-4.11): the first
 * stream connection appends it, later ones find it already there.
 */
export function pushLiveEmployeeMessage(): { ticketId: string } | null {
  const convo = conversationFor("t-desk-1");
  if (convo.messages.some((m) => m.id === "dm-live-1")) return null;
  convo.messages.push({
    id: "dm-live-1",
    ticketId: "t-desk-1",
    authorRole: "employee",
    text: "Quick update from my side — the VPN dropped twice more this hour.",
    createdAt: new Date().toISOString(),
  });
  return { ticketId: "t-desk-1" };
}
