import { useEffect, useState } from "react";

import { config } from "@/lib/config";

/** Starts the MSW browser worker when VITE_API_MOCK is true (renamed from NEXT_PUBLIC_API_MOCK). */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!config.apiMock);
  useEffect(() => {
    if (!config.apiMock) return;
    let cancelled = false;
    (async () => {
      const { worker } = await import("@/mocks/browser");
      if (cancelled) return;
      // start() registers and claims clients before resolving, so once
      // ready flips, every fetch from this page goes through the mocks.
      // Children don't render until then — no reload races with sign-in.
      await worker.start({ onUnhandledRequest: "bypass" });
      if (cancelled) return;
      try {
        const { readMockCookieIdentity, readMockJournal } = await import("@/mocks/fixtures");
        // Directory journal first: worker restarts wipe invites, so replay
        // them BEFORE the session reseed or invitees drop to employee.
        const journal = readMockJournal();
        if (journal.length > 0) {
          await fetch(`${config.apiUrl}/mock-invites/restore`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: journal }),
          }).catch(() => undefined);
        }
        if (cancelled) return;
        const identity = readMockCookieIdentity();
        if (identity) {
          await fetch(`${config.apiUrl}/mock-session`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: identity.role, email: identity.email }),
          });
        }
      } catch {
        // Best effort — RoleGate handles a missed reseed honestly.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
