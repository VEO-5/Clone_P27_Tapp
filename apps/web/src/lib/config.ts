/**
 * Client-safe config for apps/web.
 * UI-only: the web app holds no secrets. Only public env is exposed.
 *
 * Mock strategy (stays until real backend lands):
 * - Local / preview: NEXT_PUBLIC_API_MOCK=true → MSW worker serves demo data.
 * - Real backend day: set NEXT_PUBLIC_API_MOCK=false + NEXT_PUBLIC_API_URL=https://api…
 *   No code change needed — apiFetch + MockProvider already branch on this flag.
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
