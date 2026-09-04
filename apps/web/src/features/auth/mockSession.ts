"use client";

import { SESSION_COOKIE, landingForRole, type RoleName } from "@/lib/auth";
import { setMockSession } from "@/mocks/fixtures";

export const MOCK_ROLES: { role: RoleName; label: string; description: string }[] = [
  { role: "employee", label: "Ada Obi · Employee", description: "My tickets, submit, status records" },
  { role: "agent", label: "Kofi Mensah · Agent", description: "Desk dashboard, queue, reply screen" },
  { role: "admin", label: "Admin", description: "Everything + agents, settings, reports" },
];

/**
 * Mock-mode sign-in only. Sets a dummy session cookie (so the middleware
 * bouncer lets us through exactly like a real one would) and tells the MSW
 * handler which profile GET /auth/me should return.
 */
export function mockSignIn(role: RoleName): string {
  setMockSession(role);
  const value = `mock-${role}`;
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
  return landingForRole(role);
}

/** Mock-mode sign-out: clear the dummy cookie and reset the mock to signed out. */
export function mockSignOut() {
  setMockSession(null);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getMockCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
