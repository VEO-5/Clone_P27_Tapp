"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Attachment, CannedResponse, DeskTicket, Message, TicketEvent } from "@pearl27/contracts";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/shadcn/button";
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
  const [cannedIndex, setCannedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const cannedQuery = useQuery({
    queryKey: ["desk", "canned-responses"],
    queryFn: () => apiFetch<CannedResponse[]>("/desk/canned-responses"),
    staleTime: 300_000,
  });

  // "/" opens the canned list; the text after the last "/" filters it.
  const slashAt = text.lastIndexOf("/");
  const cannedOpen =
    !internal &&
    slashAt >= 0 &&
    (slashAt === 0 || /\s/.test(text[slashAt - 1]!)) &&
    !text.slice(slashAt).includes(" ") &&
    (cannedQuery.data?.length ?? 0) > 0;
  const cannedFilter = cannedOpen ? text.slice(slashAt + 1).toLowerCase() : "";
  const cannedMatches = (cannedQuery.data ?? []).filter(
    (c) => c.shortcut.toLowerCase().includes(cannedFilter) || c.title.toLowerCase().includes(cannedFilter),
  );

  function insertCanned(body: string) {
    const before = text.slice(0, slashAt);
    const next = `${before}${body} `;
    setText(next);
    setCannedIndex(0);
    textareaRef.current?.focus();
  }

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
    if (cannedOpen && cannedMatches.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCannedIndex((i) => (i + 1) % cannedMatches.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCannedIndex((i) => (i - 1 + cannedMatches.length) % cannedMatches.length);
        return;
      }
      if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
        const match = cannedMatches[cannedIndex];
        if (match) {
          event.preventDefault();
          insertCanned(match.body);
          return;
        }
      }
    }
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
    "min-h-11 rounded-md border border-ink-600 bg-white px-3 text-sm text-pearl disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
      {willAutoClaim && (
        <p className="rounded-md bg-gold-400/10 px-3 py-2 text-[12.5px] text-mist" role="note">
          Sending will assign this ticket to you.
        </p>
      )}
      <label htmlFor={`composer-text-${ticketId}`} className="sr-only">
        Message to the employee
      </label>
      <textarea
        ref={textareaRef}
        id={`composer-text-${ticketId}`}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setCannedIndex(0);
        }}
        rows={4}
        maxLength={5000}
        placeholder="Write to the employee… (Ctrl+Enter to send, / for canned)"
        className="min-h-24 rounded-md border border-ink-600 bg-white px-3 py-2 text-sm text-pearl"
      />
      {cannedOpen && (
        <ul role="listbox" aria-label="Canned responses" className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-ink-600 bg-white p-1.5">
          {cannedMatches.length === 0 && <li className="px-2 py-1.5 text-[13px] text-fog">No matches.</li>}
          {cannedMatches.map((canned, index) => (
            <li key={canned.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === cannedIndex}
                onClick={() => insertCanned(canned.body)}
                onMouseEnter={() => setCannedIndex(index)}
                className={`flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left ${index === cannedIndex ? "bg-ink-900" : ""}`}
              >
                <span className="text-[13px] font-medium text-pearl">
                  /{canned.shortcut} · {canned.title}
                </span>
                <span className="line-clamp-1 text-[12px] text-fog">{canned.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

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
      <Button onClick={() => void send()} disabled={!canSend || sending} aria-busy={sending || undefined}>
        {sending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        {buttonLabel}
      </Button>
    </div>
  );
}
