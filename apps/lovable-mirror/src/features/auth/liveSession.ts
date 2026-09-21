import { landingForRole, type RoleName } from "@/lib/auth";
import { ALLOWED_DOMAIN, type Profile } from "@/lib/contracts.vendored";
import { insforge } from "@/lib/insforge";
import { liveFetch } from "@/lib/live";

/**
 * Live (InsForge Auth) session — replaces mockSession.ts when
 * VITE_API_MOCK=false. Passwordless email OTP matches the mock UX
 * ("no account needed"): any @pearl27.com address can sign in, new addresses
 * become employees, roles are resolved server-side from profiles.
 */

export function assertWorkEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes("@") || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Use your @${ALLOWED_DOMAIN} work email.`);
  }
  return email;
}

/** Step 1: send the 6-digit code. Always show "check your email" after. */
export async function liveRequestCode(rawEmail: string): Promise<string> {
  const email = assertWorkEmail(rawEmail);
  const { error } = await insforge.auth.signInWithOtp({ email });
  if (error) throw new Error(error.message || "Couldn't send the code. Try again.");
  return email;
}

export interface LiveSignInResult {
  landing: string;
  profile: { id: string; email: string; name: string; role: RoleName } | null;
}

/** Step 2: verify the code the user typed. Session is saved automatically. */
export async function liveVerifyCode(email: string, otp: string): Promise<LiveSignInResult> {
  const name = email.split("@")[0];
  const { error } = await insforge.auth.verifyOtp({
    email,
    otp: otp.trim(),
    name,
  });
  if (error) throw new Error(error.message || "Invalid or expired code.");
  // Authoritative role from the server (profile auto-provisioned there).
  const profile = await liveFetch<Profile>("/auth/me");
  return { landing: landingForRole(profile.role as RoleName), profile };
}

/** Live sign-out: clear the InsForge session. */
export async function liveSignOut(): Promise<void> {
  try {
    await insforge.auth.signOut();
  } catch {
    // Local state reset matters more than the round-trip.
  }
}
