"use client";

import { useEffect, useRef, useState } from "react";
import type { Ticket } from "@pearl27/contracts";
import { Loader2, Star, X } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useCsatSubmit } from "./useCsatSubmit";

/** Delay after page engagement before the fly-in appears (6–10s benchmark sweet spot). */
export const CSAT_POPUP_DELAY_MS = 8000;
/** Snooze window after a manual dismiss — returns next visit/day, not this session. */
const CSAT_SNOOZE_MS = 24 * 60 * 60 * 1000;

function snoozeKey(ticketId: string): string {
  return `p27_csat_snoozed_${ticketId}`;
}

/** True when this ticket was snoozed recently (another session, <24h ago). */
export function isCsatSnoozed(ticketId: string): boolean {
  try {
    const at = Number(localStorage.getItem(snoozeKey(ticketId)) ?? 0);
    return Date.now() - at < CSAT_SNOOZE_MS;
  } catch {
    return false;
  }
}

function snoozeCsat(ticketId: string): void {
  try {
    localStorage.setItem(snoozeKey(ticketId), String(Date.now()));
  } catch {
    // Private mode etc. — session-level dismiss still applies via onSnooze.
  }
}

interface CsatPopupProps {
  ticket: Ticket;
  /** Rated (after thanks dwell) or snoozed — parent removes it for this session. */
  onDone: (rated: boolean) => void;
}

/**
 * Bottom-right CSAT fly-in. Same form + POST contract as the inline
 * CsatPrompt, new shell: delayed slide-up, Esc/X to snooze-till-next-visit,
 * never auto-dismisses while unanswered (desktop), thanks auto-closes.
 */
export function CsatPopup({ ticket, onDone }: CsatPopupProps) {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const delayTimer = useRef<number | null>(null);
  const { score, setScore, comment, setComment, error, sending, done, submit } =
    useCsatSubmit(ticket, () => onDone(true));

  // Delayed entrance: let the employee engage with the page first. If the
  // tab is hidden when the timer fires, wait for it to become visible.
  useEffect(() => {
    const show = () => {
      setVisible(true);
      trackEvent("csat_shown", { ticketId: ticket.id, reference: ticket.reference });
      // Next frame → transition from translated/faded to resting position.
      requestAnimationFrame(() => requestAnimationFrame(() => setEntering(true)));
    };
    const fire = () => {
      if (document.hidden) {
        const onVisible = () => {
          if (!document.hidden) {
            document.removeEventListener("visibilitychange", onVisible);
            show();
          }
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      show();
    };
    delayTimer.current = window.setTimeout(fire, CSAT_POPUP_DELAY_MS);
    return () => {
      if (delayTimer.current !== null) window.clearTimeout(delayTimer.current);
    };
    // Fire once per mount (one popup per session — parent renders max one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus + Esc-to-snooze once open.
  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") snooze();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Track the successful submit (done flips only on a 2xx).
  const doneOnce = useRef(false);
  useEffect(() => {
    if (done && !doneOnce.current) {
      doneOnce.current = true;
      trackEvent("csat_submitted", {
        ticketId: ticket.id,
        reference: ticket.reference,
        score,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function snooze() {
    snoozeCsat(ticket.id);
    trackEvent("csat_snoozed", { ticketId: ticket.id, reference: ticket.reference });
    onDone(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Rate ${ticket.reference}`}
      tabIndex={-1}
      className={cn(
        "fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))] rounded-lg border border-ink-700 bg-white p-4 shadow-xl outline-none transition-all duration-300 ease-out",
        entering ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-pearl break-words">
          {done ? `Thanks for rating ${ticket.reference}!` : `How was the support on “${ticket.title}”?`}
        </p>
        <button
          type="button"
          onClick={snooze}
          aria-label="Remind me later"
          title="Remind me later"
          className="grid size-8 shrink-0 place-items-center rounded-[2px] text-fog hover:bg-ink-900 hover:text-pearl"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {!done && (
        <form onSubmit={(event) => void submit(event)}>
          <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Rating out of 5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={score === value}
                aria-label={`${value} out of 5`}
                onClick={() => setScore(value)}
                className="grid size-11 place-items-center rounded-[2px] hover:bg-ink-900"
              >
                <Star
                  className={cn("size-5", value <= score ? "fill-iris-700 text-iris-700" : "text-fog")}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          <label htmlFor={`csat-popup-comment-${ticket.id}`} className="mt-2 block text-[13px] text-mist">
            Anything to add? (optional)
          </label>
          <input
            id={`csat-popup-comment-${ticket.id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Short note for the support team"
            className="mt-1 min-h-11 w-full rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl"
          />
          {error && (
            <p role="alert" className="mt-2 text-[13px] text-rose-400">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={sending} className="mt-3">
            {sending && <Loader2 className="animate-spin" aria-hidden />}
            Send rating
          </Button>
        </form>
      )}
    </div>
  );
}
