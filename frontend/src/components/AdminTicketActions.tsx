"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Form";
import {
  NEXT_STATUS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";

export function AdminTicketActions({ ticket }: { ticket: TicketDetail }) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const next = NEXT_STATUS[ticket.status];

  const patch = async (body: { status?: TicketStatus; priority?: TicketPriority; reply?: string }) => {
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Couldn't update this ticket.");
        return;
      }

      if (body.reply) setReply("");
      if (payload.emailSent) {
        setNotice("Ticket updated and a resolution email was sent.");
      } else if (body.status === "resolved") {
        setNotice("Ticket marked resolved. Email is in log-only mode.");
      } else {
        setNotice("Ticket updated.");
      }

      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {next && (
        <Button
          type="button"
          loading={saving}
          onClick={() => {
            setStatus(next);
            void patch({ status: next });
          }}
        >
          Move to {STATUS_LABELS[next]}
        </Button>
      )}

      <Field htmlFor="admin-status" label="Status">
        <Select
          id="admin-status"
          value={status}
          disabled={saving}
          onChange={(event) => {
            const value = event.target.value as TicketStatus;
            setStatus(value);
            void patch({ status: value });
          }}
        >
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>

      <Field htmlFor="admin-priority" label="Priority">
        <Select
          id="admin-priority"
          value={priority}
          disabled={saving}
          onChange={(event) => {
            const value = event.target.value as TicketPriority;
            setPriority(value);
            void patch({ priority: value });
          }}
        >
          {TICKET_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const message = reply.trim();
          if (!message) return;
          void patch({ reply: message });
        }}
        className="flex flex-col gap-3"
      >
        <Field htmlFor="admin-reply" label="Reply to the employee">
          <Textarea
            id="admin-reply"
            rows={4}
            value={reply}
            disabled={saving}
            placeholder="This will appear on their timeline."
            onChange={(event) => setReply(event.target.value)}
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          loading={saving}
          disabled={!reply.trim()}
          icon={<Send className="size-4" aria-hidden />}
        >
          Post reply
        </Button>
      </form>

      <div aria-live="polite" className="min-h-5">
        {error && (
          <p className="flex items-start gap-2 text-[13px] text-rose-400">
            <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {notice && (
          <p className="flex items-start gap-2 text-[13px] text-jade-400">
            <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
