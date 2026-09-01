"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Form";
import { patchAdminTicket } from "@/lib/adminTicket";
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
import { cn } from "@/lib/utils";

export function AdminTicketActions({ ticket }: { ticket: TicketDetail }) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(ticket.status);
    setPriority(ticket.priority);
  }, [ticket.status, ticket.priority, ticket.updatedAt]);

  const next = NEXT_STATUS[status];

  const apply = async (body: {
    status?: TicketStatus;
    priority?: TicketPriority;
    reply?: string;
  }) => {
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const result = await patchAdminTicket(ticket.id, body);
      setStatus(result.ticket.status);
      setPriority(result.ticket.priority);
      if (body.reply) setReply("");

      if (result.emailSent) {
        setNotice("Status saved. The employee was emailed about the resolution.");
      } else if (body.status === "resolved") {
        setNotice("Marked resolved. The employee will see this on their ticket.");
      } else if (body.reply) {
        setNotice("Reply posted. The employee will see it on their timeline.");
      } else {
        setNotice("Saved. The employee sees this change on My tickets and Track.");
      }

      router.refresh();
    } catch (cause) {
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setError(cause instanceof Error ? cause.message : "Couldn't update this ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-[13px] font-medium text-cream">Ticket status</p>
        <p className="mb-3 text-[12.5px] leading-relaxed text-haze">
          Click a step to update it. The employee sees the new status and a timeline entry
          immediately.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {TICKET_STATUSES.map((value, index) => {
            const current = status === value;
            return (
              <button
                key={value}
                type="button"
                disabled={saving}
                aria-pressed={current}
                aria-label={`Set status to ${STATUS_LABELS[value]}`}
                onClick={() => {
                  if (value === status) return;
                  setStatus(value);
                  void apply({ status: value });
                }}
                className={cn(
                  "min-h-11 rounded-[2px] border px-3 py-2.5 text-left transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-iris-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  current
                    ? "border-iris-400 bg-iris-500/15 text-cream"
                    : "border-cream/10 bg-night-deep text-haze hover:border-cream/25 hover:text-cream",
                )}
              >
                <span className="block text-[10px] uppercase tracking-[0.14em] text-haze">
                  Step {index + 1}
                </span>
                <span className="mt-1 block text-[13px] font-semibold">{STATUS_LABELS[value]}</span>
              </button>
            );
          })}
        </div>
        {next && (
          <Button
            type="button"
            className="mt-3 w-full"
            loading={saving}
            onClick={() => {
              setStatus(next);
              void apply({ status: next });
            }}
          >
            Advance to {STATUS_LABELS[next]}
          </Button>
        )}
      </div>

      <Field htmlFor="admin-priority" label="Priority" tone="night">
        <Select
          id="admin-priority"
          value={priority}
          disabled={saving}
          onChange={(event) => {
            const value = event.target.value as TicketPriority;
            setPriority(value);
            void apply({ priority: value });
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
          void apply({ reply: message });
        }}
        className="flex flex-col gap-3"
      >
        <Field
          htmlFor="admin-reply"
          label="Reply to the employee"
          hint="Shows on their timeline"
          tone="night"
        >
          <Textarea
            id="admin-reply"
            rows={4}
            value={reply}
            disabled={saving}
            placeholder="What did you do, or what should they try next?"
            onChange={(event) => setReply(event.target.value)}
          />
        </Field>
        <Button
          type="submit"
          variant="night"
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
