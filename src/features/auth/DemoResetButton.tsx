"use client";

import { useState } from "react";

import { config } from "@/lib/config";
import { clearMockJournal } from "@/mocks/fixtures";

import { mockSignOut } from "./mockSession";

/**
 * Mock-only demo reset (sign-in page). Clears the directory journal, resets
 * every mock store in the worker realm, signs out, and reloads — a clean
 * slate when stale demo invites pile up. Never shown against the real API.
 */
export function DemoResetButton() {
  const [resetting, setResetting] = useState(false);

  async function reset() {
    if (resetting) return;
    setResetting(true);
    try {
      clearMockJournal();
      await mockSignOut().catch(() => false);
      await fetch(`${config.apiUrl}/mock-reset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }).catch(() => undefined);
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void reset()}
      disabled={resetting}
      className="text-[12.5px] text-fog underline underline-offset-4 transition-colors hover:text-pearl disabled:cursor-wait disabled:opacity-70"
    >
      {resetting ? "Resetting demo data…" : "Reset demo data"}
    </button>
  );
}
