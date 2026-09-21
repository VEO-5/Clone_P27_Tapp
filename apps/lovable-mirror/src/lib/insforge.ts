import { createClient } from "@insforge/sdk";

/**
 * InsForge anon client for the Vite mirror.
 * Uses VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY (user-scoped, safe for browser).
 * Privileged writes stay in Edge Functions via createAdminClient (server-only API_KEY).
 */
const baseUrl = import.meta.env.VITE_INSFORGE_URL as string | undefined;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined;

if (!baseUrl || !anonKey) {
  console.warn(
    "[insforge] Missing VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY — check apps/lovable-mirror/.env.local",
  );
}

export const insforge = createClient({
  baseUrl: baseUrl ?? "",
  anonKey: anonKey ?? "",
});
