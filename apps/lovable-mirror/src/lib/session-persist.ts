import { insforge } from "./insforge";

/**
 * Durable session for live (InsForge Auth) mode.
 *
 * Root cause of the reload-signout bug: the SDK keeps the access token in
 * JS memory only ("Save session in memory"). On reload it is gone, and the
 * fallback rehydration (httpOnly refresh cookie on the cross-site API
 * domain) is blocked by default third-party-cookie policies — so the first
 * /auth/me call 401s and RoleGate bounces to /sign-in.
 *
 * Fix: mirror the access token into localStorage and restore it at boot.
 * The stored token is short-lived and refreshed silently by the SDK; every
 * successful liveFetch re-saves whatever is current.
 */

const SESSION_TOKEN_KEY = "p27_access_token";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Restore the persisted token into the SDK. Call once at boot. */
export function restoreSession(): boolean {
  try {
    const token = storage()?.getItem(SESSION_TOKEN_KEY);
    if (!token) return false;
    insforge.setAccessToken(token);
    return true;
  } catch {
    return false;
  }
}

/** Save the SDK's current valid token (no-op when signed out). */
export async function persistSession(): Promise<void> {
  try {
    const token = await insforge.getHttpClient().getValidAccessToken();
    if (token) storage()?.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Analytics-grade durability must never break the request path.
  }
}

/** Forget everything (sign-out). */
export function clearPersistedSession(): void {
  try {
    storage()?.removeItem(SESSION_TOKEN_KEY);
    insforge.setAccessToken(null);
  } catch {
    // Best effort.
  }
}

/**
 * Settle the SDK session before the app treats a 401 as "signed out".
 * Restores the stored token, then gives a silent refresh one chance to
 * complete — but never hangs boot longer than `timeoutMs`.
 */
export async function waitForAuthHydration(timeoutMs = 4000): Promise<boolean> {
  restoreSession();
  try {
    const settled = await Promise.race([
      insforge.getHttpClient().getValidAccessToken().then((t) => t),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return settled !== null;
  } catch {
    return false;
  }
}

/** Boot hook (called from main.tsx): restore + expose a DEV handle. */
export function initSession(): void {
  restoreSession();
  if (import.meta.env.DEV) {
    (window as unknown as { __insforge?: unknown }).__insforge = insforge;
  }
}
