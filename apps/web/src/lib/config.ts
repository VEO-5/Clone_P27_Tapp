/**
 * Client-safe config for apps/web.
 * UI-only: the web app holds no secrets. Only public env is exposed.
 *
 * Backend handoff (frontend complete):
 * - Local / preview with no backend: NEXT_PUBLIC_API_MOCK=true → MSW worker
 *   serves reference data from src/mocks (mirror of the prod contract).
 * - Production with real backend: set NEXT_PUBLIC_API_MOCK=false +
 *   NEXT_PUBLIC_API_URL=https://… — MockProvider never imports src/mocks,
 *   so no mock code ships to prod. No code change needed.
 * - src/mocks/handlers.ts is the working API spec until the backend returns
 *   200s; delete it only after backend parity. Mock-only routes
 *   (/mock-session, /mock-invites/restore, /mock-reset, /mock-uploads,
 *   /mock-files) must NEVER be reimplemented in prod.
 */
export const config = {
  get apiUrl(): string {
    return (
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      "http://localhost:4000"
    );
  },
  get apiMock(): boolean {
    // Default ON so `pnpm dev` works with zero backend.
    // Prod with a real API must explicitly set NEXT_PUBLIC_API_MOCK=false.
    return (
      process.env.NEXT_PUBLIC_API_MOCK?.trim().toLowerCase() !== "false"
    );
  },
} as const;
