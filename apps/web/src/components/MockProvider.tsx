"use client";

import { useEffect, useState } from "react";

import { config } from "@/lib/config";

/** Starts the MSW browser worker when NEXT_PUBLIC_API_MOCK is true. */
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
      // The worker realm holds its own session copy: re-seed it from the
      // cookie so every role (not just employee) survives reloads, and a
      // cleared cookie stays signed out.
      try {
        const { readMockCookieIdentity } = await import("@/mocks/fixtures");
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
