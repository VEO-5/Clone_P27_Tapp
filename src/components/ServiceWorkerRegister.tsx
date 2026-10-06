"use client";

import { useEffect } from "react";

/** Registers the PWA service worker in production. Dev/MSW stays untouched. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (navigator.serviceWorker.controller) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // no-op: offline support is progressive enhancement
      }
    };
    void register();
  }, []);
  return null;
}