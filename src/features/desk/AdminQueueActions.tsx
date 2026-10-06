"use client";

import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Select } from "@/components/ui/Form";
import { patchAdminTicket } from "@/lib/adminTicket";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdminQueueActions({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  // Local draft state, seeded from props. Parents remount per ticket version
  // (key includes updatedAt), so no sync effect is needed.
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [saving, setSaving] = useState<"status" | "priority" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async (
    field: "status" | "priority",
    body: { status?: TicketStatus; priority?: TicketPriority },
  ) => {
    setError(null);
    setSaving(field);
    try {
      const result = await patchAdminTicket(ticket.id, body);
      setStatus(result.ticket.status);
      setPriority(result.ticket.priority);
      window.location.reload();
    } catch (cause) {
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setError(cause instanceof Error ? cause.message : "Couldn't update this ticket.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <label className="sr-only" htmlFor={`queue-status-${ticket.id}`}>
        Status for {ticket.reference}
      </label>
      <Select
        id={`queue-status-${ticket.id}`}
        value={status}
        disabled={saving !== null}
        aria-busy={saving === "status" || undefined}
        className={cn("h-8 min-w-[9rem] text-xs", saving === "status" && "opacity-70")}
        onChange={(event) => {
          const value = event.target.value as TicketStatus;
          if (value === status) return;
          setStatus(value);
          void apply("status", { status: value });
        }}
      >
        {TICKET_STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <label className="sr-only" htmlFor={`queue-priority-${ticket.id}`}>
        Priority for {ticket.reference}
      </label>
      <Select
        id={`queue-priority-${ticket.id}`}
        value={priority}
        disabled={saving !== null}
        aria-busy={saving === "priority" || undefined}
        className={cn("h-8 min-w-[9rem] text-xs", saving === "priority" && "opacity-70")}
        onChange={(event) => {
          const value = event.target.value as TicketPriority;
          if (value === priority) return;
          setPriority(value);
          void apply("priority", { priority: value });
        }}
      >
        {TICKET_PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {PRIORITY_LABELS[value]}
          </option>
        ))}
      </Select>

      {error && (
        <p aria-live="polite" className="text-[12px] text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
