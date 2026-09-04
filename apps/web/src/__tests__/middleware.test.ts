import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isPublicPath, redirectToSignIn } from "@/middleware";

function request(path: string, cookie: boolean) {
  const req = new NextRequest(new URL(`http://localhost:3000${path}`));
  if (cookie) req.cookies.set("p27_session", "abc");
  return req;
}

describe("middleware (FE-1.9)", () => {
  it("redirects to /sign-in with next preserved, including query string", () => {
    const res = redirectToSignIn(request("/desk?tab=mine", false));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/sign-in?next=%2Fdesk%3Ftab%3Dmine");
  });

  it("lets public paths through without a cookie", () => {
    expect(redirectToSignIn(request("/sign-in?next=/desk", false))).toBeNull();
    expect(redirectToSignIn(request("/auth/denied?reason=domain", false))).toBeNull();
  });

  it("lets protected paths through with a cookie and never decodes it", () => {
    expect(redirectToSignIn(request("/desk", true))).toBeNull();
    expect(isPublicPath("/desk")).toBe(false);
  });
});
