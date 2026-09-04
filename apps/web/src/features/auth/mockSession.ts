"use client";

import { SESSION_COOKIE, landingForRole, type RoleName } from "@/lib/auth";
import { setMockSession } from "@/mocks/fixtures";
import { config } from "@/lib/config";

export const MOCK_ROLES: { role: RoleName; label: string; description: string }[] = [
  { role: "employee", label: "Ada Obi · Employee", description: "My tickets, submit, status records" },
  { role: "agent", label: "Kofi Mensah · Agent", description: "Desk dashboard, queue, reply screen" },
  { role: "admin", label: "Admin", description: "Everything + agents, settings, reports" },
];

/**
 * Mock-mode sign-in only. Sets a dummy session cookie (so the middleware
 * bouncer lets us through exactly like a real one would) and tells the MSW
 * worker realm — via POST, because the page and the Service Worker run in
 * separate JS realms — which profile GET /auth/me should return.
 */
export interface MockSignInResult {
  landing: string;
  /** Fresh profile from the worker — seed into the session query cache. */
  profile: { id: string; email: string; name: string; role: RoleName } | null;
}

export async function mockSignIn(role: RoleName): Promise<MockSignInResult> {
  setMockSession(role);
  let profile: MockSignInResult["profile"] = null;
  // The worker may still be claiming the page — retry until it serves the
  // role (or give up and let RoleGate handle the failure honestly).
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const setRes = await fetch(`${config.apiUrl}/mock-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!setRes.ok) throw new Error("mock session not acknowledged");
      const meRes = await fetch(`${config.apiUrl}/auth/me`, { credentials: "include" });
      const me = (await meRes.json().catch(() => null)) as MockSignInResult["profile"];
      if (me?.role === role) {
        profile = me;
        break;
      }
    } catch {
      // Worker not intercepting yet — wait a beat and retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const value = `mock-${role}`;
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
  return { landing: landingForRole(role), profile };
}

/** Mock-mode sign-out: clear the dummy cookie and reset the mock to signed out. */
export function mockSignOut() {
  setMockSession(null);
  try {
    void fetch(`${config.apiUrl}/mock-session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: null }),
    });
  } catch {
    // best effort
  }
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getMockCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
