import { config } from "./config";
import { trackApiCall, trackApiError } from "./analytics";
import { supabase } from "./supabase";

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string>;
  /** Extra error payload (e.g. `assignee` on 409 ALREADY_ASSIGNED). */
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401 || this.code === "UNAUTHENTICATED";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  if (res.status === 401) {
    return new ApiError(401, "UNAUTHENTICATED", "Sign in again to continue.");
  }
  const payload = (await res.json().catch(() => null)) as
    | Partial<ApiErrorShape>
    | { error?: string }
    | null;

  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as ApiErrorShape).error;
    if (typeof err === "object" && err !== null) {
      const { code, message, fieldErrors, ...details } = err as ApiErrorShape["error"] & Record<string, unknown>;
      return new ApiError(
        res.status,
        code ?? `HTTP_${res.status}`,
        message ?? "Something went wrong.",
        fieldErrors,
        Object.keys(details).length > 0 ? details : undefined,
      );
    }
    if (typeof err === "string") {
      return new ApiError(res.status, `HTTP_${res.status}`, err);
    }
  }
  return new ApiError(res.status, `HTTP_${res.status}`, `Request failed (${res.status}).`);
}

/**
 * Thin fetch wrapper. Base URL from VITE_API_URL, session via credentials
 * plus the Supabase access-token Bearer — same path + error contract
 * everywhere. The server validates the Supabase JWT.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  } catch {
    token = null;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers ?? {}) as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const err = await parseError(res);
    trackApiError(init.method ?? "GET", path, err.status, err.code);
    throw err;
  }
  trackApiCall(init.method ?? "GET", path, init.body);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
