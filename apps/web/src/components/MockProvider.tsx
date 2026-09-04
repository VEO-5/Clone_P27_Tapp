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
      if (!cancelled) {
        // start() registers and claims clients before resolving, so once
        // ready flips, every fetch from this page goes through the mocks.
        // Children don't render until then — no reload races with sign-in.
        await worker.start({ onUnhandledRequest: "bypass" });
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}
