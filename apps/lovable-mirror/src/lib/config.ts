/**
 * MIRROR config — mirrors apps/web/src/lib/config.ts with the Phase 4.2 rename.
 * NEXT_PUBLIC_API_URL -> VITE_API_URL, NEXT_PUBLIC_API_MOCK -> VITE_API_MOCK.
 * Fallback + incident comment preserved: a missing variable must never look
 * like a working app (mock defaults ON locally; prod sets VITE_API_MOCK=false).
 */
export const config = {
  get apiUrl(): string {
    const value = import.meta.env.VITE_API_URL as string | undefined;
    return value?.trim() || "http://localhost:4000";
  },
  get apiMock(): boolean {
    const value = import.meta.env.VITE_API_MOCK as string | undefined;
    return value?.trim().toLowerCase() !== "false";
  },
} as const;
