import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { fieldErrorsFrom } from "./validation";

export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string>;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json<ApiError>({ error: message, fieldErrors }, { status: 400 });
}

export function validationFailed(error: ZodError) {
  return badRequest("Please check the highlighted fields", fieldErrorsFrom(error));
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json<ApiError>({ error: message }, { status: 401 });
}

export function notFound(message = "Not found") {
  return NextResponse.json<ApiError>({ error: message }, { status: 404 });
}

/**
 * Logs the real cause server-side and returns a message safe to show a user —
 * stack traces and provider errors never reach the browser.
 */
export function serverError(context: string, cause: unknown) {
  console.error(`[api:${context}]`, cause);
  return NextResponse.json<ApiError>(
    { error: "Something went wrong on our side. Please try again." },
    { status: 500 },
  );
}
