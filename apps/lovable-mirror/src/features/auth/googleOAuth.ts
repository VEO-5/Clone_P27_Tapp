import { landingForRole, type RoleName } from "@/lib/auth";
import { ALLOWED_DOMAIN, type Profile } from "@/lib/contracts.vendored";
import { insforge } from "@/lib/insforge";
import { liveFetch } from "@/lib/live";

import { assertWorkEmail, liveSignOut, type LiveSignInResult } from "./liveSession";

/**
 * Google sign-in (live mode only). OAuth via PKCE — the SDK handles code
 * generation, redirect, and the token exchange automatically in the browser.
 * Backend provider + allowed redirect URLs are InsForge-managed; the only
 * app-side trust step is the @pearl27.com domain check after login.
 */

function googleRedirectTarget(): string {
  return `${window.location.origin}/sign-in`;
}

/** Step 1: leave for Google. Returns when the redirect starts. */
export async function startGoogleSignIn(): Promise<void> {
  recordOAuthAttempt();
  const { error } = await insforge.auth.signInWithOAuth("google", {
    redirectTo: googleRedirectTarget(),
    // Provider-specific hints only (server owns client_id/scope/pkcs/state).
    // `hd` pre-restricts the chooser to the work domain; the post-login
    // domain check below remains authoritative.
    additionalParams: { hd: "pearl27.com", prompt: "select_account" },
  });
  if (error) {
    // The redirect never started — clear the attempt flag and surface the
    // backend guidance (e.g. a rejected redirect URL tells us to allowlist).
    consumeOAuthAttempt();
    throw new Error(oauthStartMessage(error));
  }
}

/**
 * Human-readable message for a failed OAuth start. InsForgeError carries
 * machine fields (statusCode/nextActions) — the 400 case for a rejected
 * redirect URL is self-diagnosing when nextActions is included.
 */
export function oauthStartMessage(error: unknown): string {
  const details = (error ?? {}) as {
    message?: unknown;
    statusCode?: unknown;
    nextActions?: unknown;
  };
  const message =
    typeof details.message === "string" && details.message
      ? details.message
      : "Couldn't start Google sign-in. Try again.";
  const hint =
    details.statusCode === 400 && typeof details.nextActions === "string" && details.nextActions
      ? ` ${details.nextActions}`
      : "";
  return `${message}${hint}`;
}

// ---------------------------------------------------------------------------
// OAuth-attempt tracking: makes a dead return from Google visible instead of
// a silent sit on the sign-in page.
// ---------------------------------------------------------------------------

/** sessionStorage key marking a Google redirect started from this tab. */
export const OAUTH_ATTEMPT_KEY = "p27_oauth_attempt";
/** Attempts older than this are stale (user abandoned the flow). */
export const OAUTH_ATTEMPT_TTL_MS = 15 * 60 * 1000;

function attemptStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Pure freshness check over a stored timestamp (exported for unit tests).
 * Tolerates minor clock skew; rejects missing/garbage/far-future values.
 */
export function isFreshOAuthAttempt(stored: string | null, now: number = Date.now()): boolean {
  if (!stored) return false;
  const started = Number(stored);
  if (!Number.isFinite(started) || started <= 0) return false;
  const age = now - started;
  return age > -60_000 && age < OAUTH_ATTEMPT_TTL_MS;
}

/** Mark that this tab is leaving for Google (cleared on return). */
export function recordOAuthAttempt(): void {
  try {
    attemptStorage()?.setItem(OAUTH_ATTEMPT_KEY, String(Date.now()));
  } catch {
    // Tracking is diagnostic-only; never break sign-in when storage is off.
  }
}

/**
 * Peek the attempt flag without clearing (StrictMode-safe for render-time
 * reads; the effect consumes once it acts on the value).
 */
export function peekOAuthAttempt(): boolean {
  try {
    return isFreshOAuthAttempt(attemptStorage()?.getItem(OAUTH_ATTEMPT_KEY) ?? null);
  } catch {
    return false;
  }
}

/**
 * Consume the attempt flag: returns true when this tab recently left for
 * Google. Always clears, so a stale flag can never cry wolf twice.
 */
export function consumeOAuthAttempt(): boolean {
  try {
    const fresh = peekOAuthAttempt();
    attemptStorage()?.removeItem(OAUTH_ATTEMPT_KEY);
    return fresh;
  } catch {
    return false;
  }
}

/** True when the SDK currently holds a usable access token (same check liveFetch uses). */
export async function hasLiveSession(): Promise<boolean> {
  try {
    const token = await insforge.getHttpClient().getValidAccessToken();
    return Boolean(token);
  } catch {
    return false;
  }
}

/**
 * Wait for the SDK's background OAuth code exchange to settle.
 *
 * The SDK strips `?insforge_code=` synchronously at import time and exchanges
 * it asynchronously — so by the time our callback handler mounts, the URL
 * param is already gone and must NOT be used as the "did we just come back
 * from Google" signal. Instead we await the SDK's internal callback promise
 * (guarded: it is private API and may not exist on all versions) with a
 * timeout, then check for a session token.
 */
export async function waitForOAuthSettlement(timeoutMs = 8000): Promise<void> {
  try {
    const handled = (
      insforge.auth as unknown as { authCallbackHandled?: Promise<unknown> }
    ).authCallbackHandled;
    if (handled && typeof (handled as Promise<unknown>).then === "function") {
      await Promise.race([
        handled,
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
      return;
    }
  } catch {
    // Fall through to the fixed delay below.
  }
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

function stripOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("insforge_code");
  url.searchParams.delete("error");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Step 2: finish the login after Google redirects back. The SDK exchanges
 * `insforge_code` in the background on boot — wait for that to settle, then
 * resolve the role server-side exactly like the OTP flow does.
 */
export async function completeGoogleSignIn(): Promise<LiveSignInResult> {
  await waitForOAuthSettlement();
  let profile: Profile | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      profile = await liveFetch<Profile>("/auth/me");
      break;
    } catch (cause) {
      // Non-work identity: retrying is pointless (same session, same 422) and
      // the stale Gmail session would trap every retry. Sign out so the user
      // can pick their work account, then surface the message immediately.
      const status = (cause as { status?: unknown })?.status;
      const code = (cause as { code?: unknown })?.code;
      if (status === 422 || code === "INVALID_EMAIL") {
        await liveSignOut();
        stripOAuthParams();
        throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
      }
      lastError = cause;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  if (!profile) {
    stripOAuthParams();
    throw lastError instanceof Error ? lastError : new Error("Google sign-in didn't complete. Try again.");
  }
  try {
    assertWorkEmail(profile.email);
  } catch {
    // Google returns any Gmail — refuse non-work identities explicitly.
    await liveSignOut();
    throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
  }
  return { landing: landingForRole(profile.role as RoleName), profile };
}
