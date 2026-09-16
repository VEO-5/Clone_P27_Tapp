import { SESSION_COOKIE, landingForRole, type RoleName } from "@/lib/auth";
import { mockCookieValue, setMockSession, setMockSessionIdentity } from "@/mocks/fixtures";
import { config } from "@/lib/config";

export const MOCK_ROLES: { role: RoleName; label: string; description: string }[] = [
  { role: "employee", label: "Ada Obi · Employee", description: "My tickets, submit, status records" },
  { role: "agent", label: "Kofi Mensah · Agent", description: "Desk dashboard, queue, reply screen" },
  { role: "admin", label: "Admin", description: "Dashboard, admins, agents, settings, reports" },
];

export interface MockSignInResult {
  landing: string;
  /** Fresh profile from the worker — seed into the session query cache. */
  profile: { id: string; email: string; name: string; role: RoleName; demoted?: boolean } | null;
  demoted: boolean;
}

function writeSessionCookie() {
  const value = mockCookieValue();
  document.cookie = value
    ? `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

async function pollFor(
  predicate: () => Promise<boolean>,
  attempts = 10,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (await predicate()) return true;
    } catch {
      // Worker not intercepting yet — wait a beat and retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

/**
 * Mock-mode sign-in only. Sets a dummy session cookie (so the proxy
 * bouncer lets us through exactly like a real one would) and tells the MSW
 * worker realm — via POST, because the page and the Service Worker run in
 * separate JS realms — which identity GET /auth/me should return.
 *
 * The worker re-resolves the role from its own stores, so a requested role
 * is never trusted blindly: unknown emails stay employees, deactivated
 * accounts fall back to employee, and only invited/seeded addresses gain
 * desk powers. Pass an email for email sign-in; omit it for role quick-pick.
 */
export async function mockSignIn(
  role: RoleName,
  email?: string,
  name?: string,
): Promise<MockSignInResult> {
  if (email) setMockSessionIdentity({ role, email: email.toLowerCase(), name: name ?? email });
  else setMockSession(role);
  // Boxed: assignments inside the poll closure aren't tracked by narrowing.
  const found: { current: MockSignInResult["profile"] } = { current: null };
  // The worker may still be claiming the page — retry until it serves this
  // identity (or give up and let RoleGate handle the failure honestly).
  // The worker's answer is authoritative: it re-resolved the role from its
  // own stores, so a deactivated account comes back as a demoted employee.
  const expectedEmail = email?.toLowerCase();
  await pollFor(async () => {
    const setRes = await fetch(`${config.apiUrl}/mock-session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expectedEmail ? { role, email: expectedEmail } : { role }),
    });
    if (!setRes.ok) throw new Error("mock session not acknowledged");
    const meRes = await fetch(`${config.apiUrl}/auth/me`, { credentials: "include" });
    if (meRes.status === 401) return false;
    const me = (await meRes.json().catch(() => null)) as MockSignInResult["profile"];
    if (!me || me.role !== role) return false;
    if (expectedEmail && me.email !== expectedEmail) return false;
    found.current = me;
    return true;
  });
  writeSessionCookie();
  const profile = found.current;
  const finalRole = profile?.role ?? role;
  return { landing: landingForRole(finalRole), profile, demoted: profile?.demoted ?? false };
}

export interface MockEmailSignInResult extends MockSignInResult {
  email: string;
}

/**
 * Email sign-in: resolve the address via the worker (the prod-shaped flow —
 * the server owns identity), then sign in as whatever it grants.
 * Throws an Error with a user-facing message when the address is rejected.
 */
export async function mockSignInWithEmail(rawEmail: string): Promise<MockEmailSignInResult> {
  const email = rawEmail.trim().toLowerCase();
  const resolveRes = await fetch(`${config.apiUrl}/auth/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resolveRes.ok) {
    const payload = (await resolveRes.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(payload?.error?.message ?? "Use your @pearl27.com work email.");
  }
  const resolved = (await resolveRes.json()) as { email: string; name: string; role: RoleName; demoted: boolean };
  const result = await mockSignIn(resolved.role, resolved.email, resolved.name);
  return { ...result, email: resolved.email };
}

/** Shared landing rule: respect a deep-link (?next=) inside the role's area. */
export function landingTarget(next: string | undefined, landing: string): string {
  if (next && next !== "/" && next.startsWith(landing)) return next;
  return landing;
}

/**
 * Mock-mode sign-out: clear the dummy cookie and reset the mock to signed
 * out. Verifies the worker actually forgot the session (polls /auth/me
 * until 401) BEFORE resolving, so callers never navigate on a live session.
 * Returns true when sign-out is confirmed, false on timeout.
 */
export async function mockSignOut(): Promise<boolean> {
  setMockSession(null);
  const confirmed = await pollFor(async () => {
    await fetch(`${config.apiUrl}/mock-session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: null }),
    });
    const meRes = await fetch(`${config.apiUrl}/auth/me`, { credentials: "include" });
    return meRes.status === 401;
  });
  writeSessionCookie();
  return confirmed;
}

export function getMockCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
