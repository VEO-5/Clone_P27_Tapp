import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyAccessCode,
} from "@/lib/adminAuth";
import { ok, serverError, unauthorized, validationFailed } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** POST /api/admin/login — exchange the support access code for a session cookie. */
export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return validationFailed(parsed.error);

    if (!verifyAccessCode(parsed.data.accessCode)) {
      // Small constant delay to blunt brute-force attempts against the code.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return unauthorized("Invalid access code");
    }

    const response = ok({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
    return response;
  } catch (error) {
    return serverError("admin.login", error);
  }
}

/** DELETE /api/admin/login — sign out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
