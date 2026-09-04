"use client";

import { useEffect, useState } from "react";
import type { Attachment, DeskTicket, Message, TicketEvent } from "@pearl27/contracts";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch } from "@/lib/api";

type StatusChoice = "" | "open" | "in_progress" | "resolved";
type PriorityChoice = "" | "low" | "medium" | "high" | "urgent";

export interface SendOutcome {
  ticket: DeskTicket;
  events: TicketEvent[];
  messages: Message[];
  attachments: Attachment[];
}

/**
 * The composer. Button + helper mirror the §6.11 routing outcome:
 * text-only → Chat · status-only → timeline/Chat/email · internal → agents only.
 */
export function Composer({
  ticketId,
  version,
  willAutoClaim,
  onSent,
  onConflict,
  onLocked,
}: {
  ticketId: string;
  version: number;
  willAutoClaim: boolean;
  onSent: (detail: SendOutcome) => void;
  onConflict: (detail: SendOutcome | null) => void;
  onLocked: (ownerName: string) => void;
}) {
  const draftKey = `composer-draft:${ticketId}`;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [status, setStatus] = useState<StatusChoice>("");
  const [internal, setInternal] = useState(false);
  const [priority, setPriority] = useState<PriorityChoice>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft persistence: a reload or conflict never loses the text (FE-4.13).
  useEffect(() => {
    try {
      if (text) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch {
      // storage unavailable — draft lives in memory only
    }
  }, [text, draftKey]);

  const hasText = text.trim().length > 0;
  const payloadStatus = internal ? undefined : status || undefined;
  const canSend = (hasText || Boolean(payloadStatus) || Boolean(priority)) && !sending;

  const buttonLabel = internal
    ? "Add note"
    : hasText && payloadStatus
      ? "Send and change status"
      : payloadStatus
        ? "Change status"
        : "Send message";

  const helper = internal
    ? "Visible to agents only"
    : payloadStatus && !hasText
      ? "Goes to the ticket timeline, Google Chat, and email"
      : "Goes to the employee in Google Chat";

  async function send() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const detail = await apiFetch<SendOutcome>(`/desk/tickets/${ticketId}/send`, {
        method: "POST",
        body: JSON.stringify({
          ...(hasText ? { text: text.trim() } : {}),
          ...(payloadStatus ? { status: payloadStatus } : {}),
          ...(internal ? { internal: true } : {}),
          ...(priority ? { priority } : {}),
          version,
        }),
      });
      setText("");
      setStatus("");
      setPriority("");
      onSent(detail);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VERSION_CONFLICT") {
        onConflict((err.details?.detail as SendOutcome | undefined) ?? null);
      } else if (err instanceof ApiError && err.code === "LOCKED_BY_OTHER") {
        onLocked((err.details?.ownerName as string | undefined) ?? "another agent");
      } else {
        // 5xx and network: keep the draft, offer retry.
        setError(err instanceof Error ? err.message : "Couldn't send. Your draft is kept — try again.");
      }
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
    }
    if (event.key === "Escape" && status) {
      event.preventDefault();
      setStatus("");
    }
  }

  const inputClass =
    "min-h-11 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
      {willAutoClaim && (
        <p className="rounded-[2px] bg-gold-400/10 px-3 py-2 text-[12.5px] text-mist" role="note">
          Sending will assign this ticket to you.
        </p>
      )}
      <label htmlFor={`composer-text-${ticketId}`} className="sr-only">
        Message to the employee
      </label>
      <textarea
        id={`composer-text-${ticketId}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        maxLength={5000}
        placeholder="Write to the employee… (Ctrl+Enter to send)"
        className="min-h-24 rounded-[2px] border border-ink-600 bg-white px-3 py-2 text-sm text-pearl"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`composer-status-${ticketId}`} className="text-[13px] font-medium text-pearl">
            Status
          </label>
          <select
            id={`composer-status-${ticketId}`}
            value={status}
            disabled={internal}
            title={internal ? "Notes don't change status" : undefined}
            onChange={(event) => setStatus(event.target.value as StatusChoice)}
            className={inputClass}
          >
            <option value="">No change</option>
            <option value="pending" disabled title="Set by the system">
              Pending — set by the system
            </option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`composer-priority-${ticketId}`} className="text-[13px] font-medium text-pearl">
            Priority
          </label>
          <select
            id={`composer-priority-${ticketId}`}
            value={priority}
            disabled={internal}
            onChange={(event) => setPriority(event.target.value as PriorityChoice)}
            className={inputClass}
          >
            <option value="">No change</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13.5px] text-pearl">
        <input
          type="checkbox"
          checked={internal}
          onChange={(event) => setInternal(event.target.checked)}
          className="size-4 accent-iris-500"
        />
        Internal note
      </label>

      <p className="text-[12.5px] text-fog" aria-live="polite">
        {helper}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-rose-400">
          {error}{" "}
          <button type="button" onClick={() => void send()} className="font-medium underline underline-offset-4">
            Retry
          </button>
        </p>
      )}
      <Button onClick={() => void send()} disabled={!canSend} loading={sending} icon={<Send className="size-4" aria-hidden />}>
        {buttonLabel}
      </Button>
    </div>
  );
}
