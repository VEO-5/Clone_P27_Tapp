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

/** True when the URL carries a freshly returned OAuth code. */
export function hasOAuthCode(): boolean {
  return new URLSearchParams(window.location.search).has("insforge_code");
}

function stripOAuthParams() {
  window.history.replaceState(null, "", window.location.pathname);
}

/**
 * Step 2: finish the login after Google redirects back. The SDK exchanges
 * `insforge_code` on init — allow a beat for that round-trip, then resolve
 * the role server-side exactly like the OTP flow does.
 */
export async function completeGoogleSignIn(): Promise<LiveSignInResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const profile = await liveFetch<Profile>("/auth/me");
      try {
        assertWorkEmail(profile.email);
      } catch {
        // Google returns any Gmail — refuse non-work identities explicitly.
        await liveSignOut();
        throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
      }
      return { landing: landingForRole(profile.role as RoleName), profile };
    } catch (cause) {
      lastError = cause;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  stripOAuthParams();
  throw lastError instanceof Error ? lastError : new Error("Google sign-in didn't complete. Try again.");
}
