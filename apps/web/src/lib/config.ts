/**
 * Client-safe config for apps/web (Phase 0).
 * UI-only: the web app holds no secrets. Only public env is exposed.
 */

export const config = {
  get apiUrl(): string {
    return (
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      "http://localhost:4000"
    );
  },
  get apiMock(): boolean {
    return (
      process.env.NEXT_PUBLIC_API_MOCK?.trim().toLowerCase() !== "false"
    );
  },
} as const;
