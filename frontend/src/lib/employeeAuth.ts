import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "./env";

export const EMPLOYEE_COOKIE = "p27_employee_session";
export const EMPLOYEE_TTL_SECONDS = 60 * 60 * 24 * 30; // come back for a month

/**
 * Email-only employee session. There is no password: the work address they
 * submitted with is the key, matching the brief's "no account" intake.
 *
 * The email is base64url-encoded so `@` and `.` cannot break the token format.
 * HttpOnly + SameSite=Lax — JavaScript cannot read it.
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

export function encodeEmail(email: string): string {
  return Buffer.from(email.trim().toLowerCase()).toString("base64url");
}

export function decodeEmail(value: string): string | null {
  try {
    const email = Buffer.from(value, "base64url").toString("utf8").trim().toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

export function createEmployeeToken(email: string, ttlSeconds = EMPLOYEE_TTL_SECONDS): string {
  const subject = encodeEmail(email);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${subject}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export interface EmployeeSession {
  email: string;
  expiresAt: number;
}

export function verifyEmployeeToken(token: string | undefined): EmployeeSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [subject, expiry, signature] = parts;
  if (!safeEqual(signature, sign(`${subject}.${expiry}`))) return null;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const email = decodeEmail(subject);
  if (!email) return null;

  return { email, expiresAt };
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const store = await cookies();
  return verifyEmployeeToken(store.get(EMPLOYEE_COOKIE)?.value);
}

export function employeeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EMPLOYEE_TTL_SECONDS,
  };
}
