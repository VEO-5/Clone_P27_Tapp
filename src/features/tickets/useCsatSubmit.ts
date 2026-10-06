"use client";

import { useEffect, useRef, useState } from "react";
import type { Ticket } from "@pearl27/contracts";

import { apiFetch, ApiError } from "@/lib/api";

/** Thanks-state dwell before the parent dismisses the prompt. */
export const CSAT_THANKS_MS = 2500;

/**
 * Shared CSAT submit logic for the inline form (CsatPrompt) and the
 * bottom-right fly-in (CsatPopup). Same validation + POST contract
 * (`POST /tickets/:id/csat`), same thanks dwell.
 */
export function useCsatSubmit(ticket: Ticket, onRated: () => void) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const ratedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (ratedTimer.current !== null) window.clearTimeout(ratedTimer.current);
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (score < 1) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await apiFetch(`/tickets/${ticket.id}/csat`, {
        method: "POST",
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      setDone(true);
      // Let the thanks state paint before the parent dismisses this prompt.
      // Without the delay the form just vanishes with no confirmation.
      ratedTimer.current = window.setTimeout(() => onRated(), CSAT_THANKS_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your rating. Try again.");
    } finally {
      setSending(false);
    }
  }

  return { score, setScore, comment, setComment, error, sending, done, submit };
}
