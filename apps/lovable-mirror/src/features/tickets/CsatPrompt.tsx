"use client";

import { Loader2, Star } from "lucide-react";
import type { Ticket } from "@pearl27/contracts";

import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
import { useCsatSubmit } from "./useCsatSubmit";

/** CSAT form on a resolved, unrated ticket (FE-2.16). */
export function CsatPrompt({ ticket, onRated }: { ticket: Ticket; onRated: () => void }) {
  const { score, setScore, comment, setComment, error, sending, done, submit } =
    useCsatSubmit(ticket, onRated);

  if (done) {
    return (
      <div className="rounded-[4px] border border-jade-400/30 bg-jade-400/10 p-4" role="status">
        <p className="text-[13.5px] font-semibold text-pearl">Thanks for rating {ticket.reference}!</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-[4px] border border-ink-700 bg-white p-4"
      aria-label={`Rate ${ticket.reference}`}
    >
      <p className="text-[13.5px] font-semibold text-pearl break-words">
        How was the support on “{ticket.title}”?
      </p>
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
      <label htmlFor={`csat-comment-${ticket.id}`} className="mt-2 block text-[13px] text-mist">
        Anything to add? (optional)
      </label>
      <input
        id={`csat-comment-${ticket.id}`}
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
  );
}
