import posthog from "posthog-js";

/**
 * Product analytics (PostHog). No-op until VITE_POSTHOG_KEY is set, so local
 * mock dev without env stays silent. Works in both mock and live API modes —
 * events are frontend-side; user identity comes from the session profile.
 */

let started = false;

export function initAnalytics(): void {
  if (started) return;
  const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim();
  if (!key) return;
  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() ||
    "https://us.posthog.com";
  started = true;
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    // Smoke alarm: uncaught JS exceptions become $exception events.
    capture_exceptions: true,
    // Session replay on (100% while traffic is tiny), ticket text masked —
    // replays show clicks/layout, never input contents.
    session_recording: { maskAllInputs: true },
    persistence: "localStorage",
  });
}

export interface AnalyticsIdentity {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Bind/clear the PostHog identity to the current session profile. */
export function identifyUser(profile: AnalyticsIdentity | null | undefined): void {
  if (!started) return;
  if (!profile) {
    posthog.reset();
    return;
  }
  posthog.identify(profile.id, {
    email: profile.email,
    name: profile.name,
    role: profile.role,
  });
}

/** Pull known domain fields out of a JSON request body for event props. */
function bodyProps(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== "string" || !body) return {};
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const props: Record<string, unknown> = {};
    for (const key of ["categoryId", "priority", "status"]) {
      if (typeof parsed[key] === "string") props[key] = parsed[key];
    }
    return props;
  } catch {
    return {};
  }
}

/** Generic event capture (no-op until init). Prefer domain helpers above. */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!started) return;
  posthog.capture(name, props);
}

/**
 * Domain events derived from API calls (single choke point in apiFetch /
 * liveFetch, so mock + live modes both report). Only successful calls reach
 * here — callers invoke this after a 2xx.
 */
export function trackApiCall(
  method: string,
  path: string,
  body?: BodyInit | null,
): void {
  if (!started || method.toUpperCase() !== "POST") return;
  const props = bodyProps(body);
  if (path === "/tickets") posthog.capture("ticket_created", props);
  else if (/\/claim$/.test(path)) posthog.capture("ticket_claimed");
  else if (/\/release$/.test(path)) posthog.capture("ticket_released");
  else if (/\/send$/.test(path)) posthog.capture("message_sent", props);
}

/**
 * Failed API calls become `api_error` events (the second smoke alarm next to
 * $exception autocapture). Props let you slice by endpoint + error code in
 * PostHog (e.g. spike of VERSION_CONFLICT on /send, or 401s on /auth/me).
 */
export function trackApiError(
  method: string,
  path: string,
  status: number,
  code: string,
): void {
  if (!started) return;
  posthog.capture("api_error", { method: method.toUpperCase(), path, status, code });
}
