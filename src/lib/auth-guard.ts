import { z } from "zod";

// Framework-agnostic port of apps/web auth mechanics:
// - lib/auth.ts: SESSION_COOKIE, landingForRole, roleAtLeast
// - proxy.ts: PUBLIC_PREFIXES, isPublicPath, redirectToSignIn (?next= round trip)
//
// No Next.js / TanStack imports — pure functions, unit-tested in
// auth-guard.test.ts (a rewrite of proxy.test.ts's 3 tests, FE-L-4.5..4.9).
// The TanStack `beforeLoad` guards on the (employee)/(desk) layout routes
// consume `guardPath` on arrival; the only integration work left is reading
// the session (server useSession — Decision 2, backend-agreed) instead of
// the `hasSession` boolean passed in here.

export const SESSION_COOKIE = "p27_session";

export const roleSchema = z.enum(["employee", "agent", "admin"]);
export type RoleName = z.infer<typeof roleSchema>;

const LANDING: Record<RoleName, string> = {
  employee: "/tickets",
  agent: "/desk",
  admin: "/desk/admin",
};

/** Role landing: signed out -> /sign-in, else the role's home. */
export function landingForRole(role: RoleName | undefined): string {
  if (!role) return "/sign-in";
  return LANDING[role] ?? "/tickets";
}

const RANK: Record<RoleName, number> = { employee: 0, agent: 1, admin: 2 };

/** True when `role` meets the minimum required role. */
export function roleAtLeast(role: RoleName | undefined, minimum: RoleName): boolean {
  if (!role) return false;
  return (RANK[role] ?? -1) >= (RANK[minimum] ?? 99);
}

/** Exact port of proxy.ts PUBLIC_PREFIXES — cookie presence check only,
 *  never decodes the cookie. Role gates live in layouts + API. */
export const PUBLIC_PREFIXES = [
  "/sign-in",
  "/auth/denied",
  "/_next",
  "/favicon.ico",
  "/pearl27-logo.png",
  "/mockServiceWorker.js",
  "/sw.js",
  "/manifest.webmanifest",
  "/icon.svg",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export interface GuardDecision {
  /** Non-null when the request must redirect to sign-in. */
  redirectTo: string | null;
}

/** Exact port of redirectToSignIn logic without Next types. */
export function guardPath(pathname: string, search: string, hasSession: boolean): GuardDecision {
  if (isPublicPath(pathname)) return { redirectTo: null };
  if (hasSession) return { redirectTo: null };
  const next = `${pathname}${search}`;
  return { redirectTo: `/sign-in?next=${encodeURIComponent(next)}` };
}

/** ?next= value consumed by the sign-in screen after login (FE-L-4.6). */
export const signInSearchSchema = z.object({
  next: z.string().catch("/"),
});
export type SignInSearch = z.infer<typeof signInSearchSchema>;
