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
  // Explicit OAuth callback handling (see features/auth/googleOAuth.ts).
  // The SDK's auto-detect strips ?insforge_code= at import time and exchanges
  // it in the background while swallowing every failure into console.debug —
  // that silent path stranded users on the sign-in page with no session and
  // no error. We exchange the code ourselves so all outcomes are visible.
  auth: { detectOAuthCallback: false },
});
