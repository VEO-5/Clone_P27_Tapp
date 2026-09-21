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
  const { error } = await insforge.auth.signInWithOAuth("google", {
    redirectTo: googleRedirectTarget(),
    // Provider-specific hints only (server owns client_id/scope/pkcs/state).
    // `hd` pre-restricts the chooser to the work domain; the post-login
    // domain check below remains authoritative.
    additionalParams: { hd: "pearl27.com", prompt: "select_account" },
  });
  if (error) throw new Error(error.message || "Couldn't start Google sign-in. Try again.");
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
