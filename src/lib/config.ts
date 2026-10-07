/**
 * App config — single production backend. A missing VITE_API_URL must never
 * look like a working app: warn loudly in dev instead of falling back.
 */
export const config = {
  get apiUrl(): string {
    const url = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";
    if (!url && import.meta.env.DEV) {
      console.warn("[config] VITE_API_URL is empty — data calls will fail. Point it at the API server.");
    }
    return url;
  },
} as const;
