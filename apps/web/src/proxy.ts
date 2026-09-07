import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/sign-in", "/auth/denied", "/_next", "/favicon.ico", "/pearl27-logo.png", "/mockServiceWorker.js", "/sw.js", "/manifest.webmanifest", "/icon.svg"];

/** Cookie presence check only — never decodes the cookie. Role gates live in layouts + API. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function redirectToSignIn(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return null;
  if (request.cookies.has(SESSION_COOKIE)) return null;
  const next = `${pathname}${search}`;
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  return redirectToSignIn(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
