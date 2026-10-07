import { landingForRole, type RoleName } from "@/lib/auth";
import { ALLOWED_DOMAIN, type Profile } from "@/lib/contracts.vendored";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

/**
 * Supabase Auth session — the only auth path (mock + InsForge removed).
 * Passwordless email OTP matches the original UX ("no account needed"): any
 * @pearl27.com address can sign in, new addresses become employees, roles
 * resolve server-side from profiles. Google OAuth is the one-click path.
 */

export function assertWorkEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
  }
  return email;
}

export interface SupabaseSignInResult {
  landing: string;
  profile: { id: string; email: string; name: string; role: RoleName } | null;
}

/** Step 1: send the 6-digit email code. */
export async function requestEmailCode(rawEmail: string): Promise<string> {
  const email = assertWorkEmail(rawEmail);
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new Error(error.message || "Couldn't send the code. Try again.");
  return email;
}

/** Step 2: verify the code, then resolve the authoritative role server-side. */
export async function verifyEmailCode(email: string, token: string): Promise<SupabaseSignInResult> {
  const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: "email" });
  if (error) throw new Error(error.message || "Invalid or expired code.");
  const profile = await apiFetch<Profile>("/auth/me");
  return { landing: landingForRole(profile.role as RoleName), profile };
}

/**
 * Human-readable message for a failed OAuth start. Supabase AuthError
 * carries machine fields — surface the message plus any actionable hint.
 */
export function oauthStartMessage(error: unknown): string {
  const details = (error ?? {}) as { message?: unknown; status?: unknown; code?: unknown };
  const message =
    typeof details.message === "string" && details.message
      ? details.message
      : "Couldn't start Google sign-in. Try again.";
  return message;
}

/** Map an OAuth completion failure to a user-facing message (pure, tested). */
export function exchangeErrorMessage(error: unknown): string {
  const details = (error ?? {}) as { message?: unknown; code?: unknown };
  const code = typeof details.code === "string" ? details.code : "";
  if (code === "PKCE_VERIFIER_MISSING" || code === "flow_state_not_found") {
    return "Google sign-in expired before completing (browser session changed). Try again.";
  }
  return typeof details.message === "string" && details.message
    ? details.message
    : "Google sign-in didn't complete. Try again.";
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

function googleRedirectTarget(): string {
  return `${window.location.origin}/sign-in`;
}

/** Step 1: leave for Google. Returns when the redirect starts. */
export async function startGoogleSignIn(): Promise<void> {
  recordOAuthAttempt();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: googleRedirectTarget(),
      // Provider hints only (server owns client_id/scope). `hd` pre-restricts
      // the chooser to the work domain; the post-login check stays authoritative.
      queryParams: { hd: "pearl27.com", prompt: "select_account" },
    },
  });
  if (error) {
    // The redirect never started — clear the attempt flag and surface why.
    consumeOAuthAttempt();
    throw new Error(oauthStartMessage(error));
  }
}

/** True when Supabase currently holds a usable session. */
export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

export interface OAuthReturn {
  code: string | null;
  error: string | null;
}

/** Pure parse over a query string (exported for unit tests). */
export function parseOAuthReturn(search: string): OAuthReturn {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const code = params.get("code")?.trim() || null;
    const error = (params.get("error") ?? params.get("error_description"))?.trim() || null;
    return { code, error };
  } catch {
    return { code: null, error: null };
  }
}

/** Read the current URL's OAuth return params (non-destructive). */
export function readOAuthReturn(): OAuthReturn {
  try {
    return parseOAuthReturn(window.location.search);
  } catch {
    return { code: null, error: null };
  }
}

/**
 * Should /sign-in render the OAuth loading takeover instead of the form?
 * Pure (exported for unit tests): true when the URL carries a return OR this
 * tab recently left for Google. Synchronous so the route decides at mount
 * with zero form-flash.
 */
export function shouldShowOAuthLoader(search: string, attempted: boolean): boolean {
  if (attempted) return true;
  const { code, error } = parseOAuthReturn(search);
  return Boolean(code || error);
}

function stripOAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Step 2: finish the login after Google redirects back. Supabase auto-exchanges
 * ?code= on load (detectSessionInUrl), so by the time this runs the session
 * is usually already present — the explicit branches below only cover the
 * failure shapes. No silent outcomes.
 */
export async function completeGoogleSignIn(): Promise<SupabaseSignInResult> {
  if (!(await hasSupabaseSession())) {
    const returned = readOAuthReturn();
    if (returned.error) {
      stripOAuthParams();
      throw new Error(`Google sign-in failed: ${returned.error}`);
    }
    throw new Error("Google sign-in didn't complete — no session was established. Try again.");
  }
  let profile: Profile | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      profile = await apiFetch<Profile>("/auth/me");
      break;
    } catch (cause) {
      // Non-work identity: retrying is pointless (same session, same 422) and
      // the stale Gmail session would trap every retry. Sign out so the user
      // can pick their work account, then surface the message immediately.
      const status = (cause as { status?: unknown })?.status;
      const code = (cause as { code?: unknown })?.code;
      if (status === 422 || code === "INVALID_EMAIL") {
        await signOutEverywhere();
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
    await signOutEverywhere();
    throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
  }
  return { landing: landingForRole(profile.role as RoleName), profile };
}

/**
 * Sign out: Supabase session + query cache (cleared by the caller). No server
 * round-trip — the server holds no session (stateless Supabase JWT per
 * request), so `supabase.auth.signOut()` is the complete sign-out.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local state reset matters more than the round-trip.
  }
}
