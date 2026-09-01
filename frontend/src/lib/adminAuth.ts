import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "./env";

export const SESSION_COOKIE = "p27_support_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // one working day

/**
 * Access-code auth, right-sized for the assessment timebox.
 *
 * The cookie holds an HMAC-signed `subject.expiry` payload, so it cannot be
 * forged client-side and it expires on its own. It is HttpOnly + SameSite=Lax
 * so JavaScript can't read it and it isn't sent on cross-site requests.
 *
 * Upgrade path: swap `verifyAccessCode` for Supabase Auth and read a role
 * claim instead — every call site already goes through `requireAdmin()`.
 */

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyAccessCode(code: string): boolean {
  return safeEqual(code.trim(), env.adminAccessCode);
}

export function createSessionToken(subject = "support", ttlSeconds = SESSION_TTL_SECONDS): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${subject}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export interface SessionClaims {
  subject: string;
  expiresAt: number;
}

export function verifySessionToken(token: string | undefined): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [subject, expiry, signature] = parts;
  if (!safeEqual(signature, sign(`${subject}.${expiry}`))) return null;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return { subject, expiresAt };
}

/** Reads and verifies the session from the request cookies. */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
