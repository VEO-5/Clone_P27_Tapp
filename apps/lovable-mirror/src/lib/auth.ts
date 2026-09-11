import type { Role } from "./contracts.vendored";

/**
 * Port of apps/web lib/auth.ts. Type source is the vendored contracts copy
 * (./contracts.vendored.ts); behavior identical. Auth-guard mechanics
 * (PUBLIC_PREFIXES, ?next=) live in ./auth-guard.ts.
 */
export const SESSION_COOKIE = "p27_session";

export type RoleName = Role;

const LANDING: Record<RoleName, string> = {
  employee: "/tickets",
  agent: "/desk",
  admin: "/desk/admin",
};

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
