import { trackApiCall, trackApiError } from "./analytics";
import { ApiError } from "./api";
import { config } from "./config";
import { insforge } from "./insforge";

/**
 * Live fetch against the InsForge `api` Edge Function router.
 * Mirrors apiFetch's contract (path + JSON + error envelope) but authenticates
 * with the user's Bearer access token instead of the mock session cookie.
 */
export async function liveFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Public routes (/categories, /known-issues) serve without a session;
  // everything else 401s server-side when the token is missing.
  const token = await insforge.getHttpClient().getValidAccessToken();
  const method = (init.method ?? "GET").toUpperCase();
  const url = `${config.insforgeUrl}/functions/api?path=${encodeURIComponent(path)}`;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, method, headers });
  if (res.status === 401) {
    trackApiError(method, path, 401, "UNAUTHENTICATED");
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in again to continue.");
  }
  const payload = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string; fieldErrors?: Record<string, string> } & Record<string, unknown>;
  } | null;
  if (!res.ok) {
    const e = payload?.error;
    const { code, message, fieldErrors, ...details } = (e ?? {}) as {
      code?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    } & Record<string, unknown>;
    const apiError = new ApiError(
      res.status,
      code ?? `HTTP_${res.status}`,
      message ?? "Something went wrong.",
      fieldErrors,
      Object.keys(details).length > 0 ? details : undefined,
    );
    trackApiError(method, path, apiError.status, apiError.code);
    throw apiError;
  }
  if (res.status === 204) return undefined as T;
  trackApiCall(method, path, init.body);
  return payload as T;
}
