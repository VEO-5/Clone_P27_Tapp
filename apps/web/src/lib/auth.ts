import type { Role } from "@pearl27/contracts";

/**
 * Provisional session cookie name. The API is authoritative for the real
 * name/flags; middleware only checks presence and never decodes it.
 */
export const SESSION_COOKIE = "p27_session";

export type RoleName = Role;

const LANDING: Record<RoleName, string> = {
  employee: "/tickets",
  agent: "/desk",
  admin: "/admin",
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
