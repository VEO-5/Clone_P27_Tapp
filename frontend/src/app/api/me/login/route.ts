import { NextResponse, type NextRequest } from "next/server";

import {
  EMPLOYEE_COOKIE,
  createEmployeeToken,
  employeeCookieOptions,
} from "@/lib/employeeAuth";
import { ok, serverError, validationFailed } from "@/lib/http";
import { employeeLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** POST /api/me/login — open the employee ticket inbox for this work email. */
export async function POST(request: NextRequest) {
  try {
    const parsed = employeeLoginSchema.safeParse(await request.json());
    if (!parsed.success) return validationFailed(parsed.error);

    const response = ok({ ok: true, email: parsed.data.email });
    response.cookies.set(
      EMPLOYEE_COOKIE,
      createEmployeeToken(parsed.data.email),
      employeeCookieOptions(),
    );
    return response;
  } catch (error) {
    return serverError("employee.login", error);
  }
}

/** DELETE /api/me/login — sign out of the employee inbox. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EMPLOYEE_COOKIE, "", { ...employeeCookieOptions(), maxAge: 0 });
  return response;
}
