"use client";

import { useState } from "react";

export function KnownIssueBanner({ issue }: { issue: { id: string; title: string; message: string } }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(`dismissed-ki-${issue.id}`) === "1";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  function dismiss() {
    try {
      sessionStorage.setItem(`dismissed-ki-${issue.id}`, "1");
    } catch {
      // storage unavailable — dismiss for this render only
    }
    setDismissed(true);
  }
  return (
    <div className="rounded-[4px] border border-l-2 border-gold-400/30 border-l-gold-400 bg-gold-400/10 p-4" role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-semibold text-pearl">{issue.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-mist">{issue.message}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss incident notice"
          className="grid size-11 shrink-0 place-items-center rounded-[2px] text-mist hover:bg-ink-900 hover:text-pearl"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
