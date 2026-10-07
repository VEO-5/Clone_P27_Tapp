/**
 * Shared landing rule: respect a deep-link (?next=) inside the role's area.
 *
 * Security: `next` arrives from the URL bar, so it is untrusted input. Only
 * same-origin app paths strictly inside the role landing are honored —
 * absolute URLs, protocol-relative URLs, backslash tricks, and sibling
 * prefixes ("/tickets.evil") all fall back to the landing. Anything else
 * would be an open redirect.
 */
export function landingTarget(next: string | undefined, landing: string): string {
  if (!next || next === "/") return landing;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return landing;
  if (next.startsWith("//") || next.includes("\\")) return landing;
  const path = next.startsWith("/") ? next : `/${next}`;
  const pathname = path.split("?")[0].split("#")[0];
  if (pathname === landing || pathname.startsWith(`${landing}/`)) return next;
  return landing;
}
