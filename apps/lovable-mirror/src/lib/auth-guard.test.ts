import { describe, expect, it } from "vitest";

import {
  guardPath,
  isPublicPath,
  landingForRole,
  PUBLIC_PREFIXES,
  roleAtLeast,
  signInSearchSchema,
} from "./auth-guard";

describe("guardPath (rewrite of proxy.test.ts, FE-L-4.5..4.9)", () => {
  it("redirects to /sign-in with next preserved, including query string (FE-L-4.5)", () => {
    expect(guardPath("/desk", "?tab=mine", false)).toEqual({
      redirectTo: "/sign-in?next=%2Fdesk%3Ftab%3Dmine",
    });
  });

  it("lets public paths through without a session (FE-L-4.8)", () => {
    expect(guardPath("/sign-in", "?next=/desk", false).redirectTo).toBeNull();
    expect(guardPath("/auth/denied", "?reason=domain", false).redirectTo).toBeNull();
  });

  it("lets protected paths through with a session and never decodes it (FE-L-4.9)", () => {
    expect(guardPath("/desk", "", true).redirectTo).toBeNull();
    expect(isPublicPath("/desk")).toBe(false);
  });

  it("covers every PUBLIC_PREFIXES entry without a session", () => {
    for (const prefix of PUBLIC_PREFIXES) {
      expect(guardPath(prefix, "", false).redirectTo).toBeNull();
      expect(guardPath(`${prefix}/extra`, "", false).redirectTo).toBeNull();
    }
    expect(guardPath("/", "", false).redirectTo).toBe("/sign-in?next=%2F");
    expect(guardPath("/tickets/PRL-ABC", "", false).redirectTo).toBe(
      "/sign-in?next=%2Ftickets%2FPRL-ABC",
    );
  });
});

describe("landingForRole", () => {
  it("maps roles to homes and signed-out to /sign-in (FE-L-4.6)", () => {
    expect(landingForRole(undefined)).toBe("/sign-in");
    expect(landingForRole("employee")).toBe("/tickets");
    expect(landingForRole("agent")).toBe("/desk");
    expect(landingForRole("admin")).toBe("/desk/admin");
  });
});

describe("roleAtLeast", () => {
  it("ranks employee < agent < admin and rejects signed-out", () => {
    expect(roleAtLeast("admin", "agent")).toBe(true);
    expect(roleAtLeast("agent", "admin")).toBe(false);
    expect(roleAtLeast("agent", "agent")).toBe(true);
    expect(roleAtLeast(undefined, "employee")).toBe(false);
  });
});

describe("sign-in ?next= search", () => {
  it("defaults to / and keeps the round-trip value", () => {
    expect(signInSearchSchema.parse({})).toEqual({ next: "/" });
    expect(signInSearchSchema.parse({ next: "/desk/queue" })).toEqual({ next: "/desk/queue" });
  });
});
