import { config } from "./config";

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

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
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
      return new ApiError(
        res.status,
        err.code ?? `HTTP_${res.status}`,
        err.message ?? "Something went wrong.",
        err.fieldErrors,
      );
    }
    if (typeof err === "string") {
      return new ApiError(res.status, `HTTP_${res.status}`, err);
    }
  }
  return new ApiError(res.status, `HTTP_${res.status}`, `Request failed (${res.status}).`);
}

/**
 * Thin fetch wrapper over packages/api-client.
 * Base URL from NEXT_PUBLIC_API_URL, session cookie via credentials:include.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
