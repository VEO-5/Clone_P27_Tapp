"use client";

import { useEffect, useRef, useState } from "react";
import type { Message, TicketEvent } from "@pearl27/contracts";
import { ArrowDown, MessageCircle } from "lucide-react";

import { formatDateTime } from "@/lib/utils";

export type StreamItem =
  | { kind: "message"; id: string; createdAt: string; from: "agent" | "employee"; text: string; delivered: boolean }
  | { kind: "event"; id: string; createdAt: string; text: string }
  | { kind: "note"; id: string; createdAt: string; text: string };

/** Merge the three item kinds into one chronological stream. */
export function buildStream(messages: Message[], events: TicketEvent[]): StreamItem[] {
  const items: StreamItem[] = [];
  for (const message of messages) {
    items.push({
      kind: "message",
      id: message.id,
      createdAt: message.createdAt,
      from: message.authorRole === "agent" ? "agent" : "employee",
      text: message.text,
      delivered: true,
    });
  }
  for (const event of events) {
    if (event.type === "message") continue;
    if (event.type === "internal_note") {
      items.push({ kind: "note", id: event.id, createdAt: event.createdAt, text: event.message ?? "Internal note" });
    } else if (event.type !== "created" && event.type !== "assigned" && event.type !== "released") {
      items.push({ kind: "event", id: event.id, createdAt: event.createdAt, text: event.message ?? "Status updated" });
    } else if (event.type === "created") {
      items.push({ kind: "event", id: event.id, createdAt: event.createdAt, text: "Ticket created" });
    }
  }
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * One chronological list, three visual treatments. Auto-scrolls to newest
 * with a "jump to latest" pill when scrolled up.
 */
export function ConversationStream({ messages, events }: { messages: Message[]; events: TicketEvent[] }) {
  const items = buildStream(messages, events);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stuckUp, setStuckUp] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && !stuckUp) el.scrollTop = el.scrollHeight;
  }, [items.length, stuckUp]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setStuckUp(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }

  function jumpToLatest() {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setStuckUp(false);
    }
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1"
      >
        {items.length === 0 && <p className="text-sm text-fog">No conversation yet.</p>}
        {items.map((item) => {
          if (item.kind === "note") {
            return (
              <div key={item.id} className="rounded-[4px] border border-dashed border-ink-600 bg-ink-900/50 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog">
                  Internal — not visible to the employee
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-pearl-dim">{item.text}</p>
                <p className="mt-1 text-[11.5px] text-fog">{formatDateTime(item.createdAt)}</p>
              </div>
            );
          }
          if (item.kind === "event") {
            return (
              <div key={item.id} className="flex items-center gap-2 px-1 text-[12.5px] text-fog">
                <span className="h-px flex-1 bg-ink-700" aria-hidden />
                <span className="shrink-0">
                  {item.text} · {formatDateTime(item.createdAt)}
                </span>
                <span className="h-px flex-1 bg-ink-700" aria-hidden />
              </div>
            );
          }
          const mine = item.from === "agent";
          return (
            <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-[4px] px-3.5 py-3 ${
                  mine ? "bg-iris-500 text-white" : "border border-ink-700 bg-white text-pearl"
                }`}
              >
                <p className={`flex items-center gap-1.5 text-[11px] font-medium ${mine ? "text-white/80" : "text-fog"}`}>
                  <MessageCircle className="size-3" aria-hidden />
                  {mine ? "You → employee" : "Employee → you"}
                  <span aria-hidden>·</span>
                  <span>{mine ? (item.delivered ? "delivered" : "sent") : formatDateTime(item.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed break-words">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {stuckUp && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-pearl px-4 text-[13px] font-medium text-cream shadow-lg"
        >
          <ArrowDown className="size-3.5" aria-hidden />
          Jump to latest
        </button>
      )}
    </div>
  );
}

/** "Ada is also viewing" bar driven by SSE presence. */
export function PresenceBar({ viewers, me }: { viewers: string[]; me: string }) {
  const others = viewers.filter((name) => name !== me);
  if (others.length === 0) return null;
  return (
    <p role="status" className="text-[12.5px] text-fog">
      {others.join(", ")} {others.length === 1 ? "is" : "are"} also viewing
    </p>
  );
}
