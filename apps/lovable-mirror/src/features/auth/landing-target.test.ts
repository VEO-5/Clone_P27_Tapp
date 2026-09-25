import { describe, expect, it } from "vitest";

import { landingTarget } from "./mockSession";

describe("landingTarget (?next= hardening)", () => {
  it("honors deep links strictly inside the role landing", () => {
    expect(landingTarget("/tickets/PRL-ABC123", "/tickets")).toBe("/tickets/PRL-ABC123");
    expect(landingTarget("/desk/queue?tab=mine", "/desk")).toBe("/desk/queue?tab=mine");
    expect(landingTarget("/tickets", "/tickets")).toBe("/tickets");
  });

  it("falls back for missing or root values", () => {
    expect(landingTarget(undefined, "/tickets")).toBe("/tickets");
    expect(landingTarget("/", "/tickets")).toBe("/tickets");
    expect(landingTarget("", "/tickets")).toBe("/tickets");
  });

  it("rejects absolute and protocol-relative URLs (open redirect)", () => {
    expect(landingTarget("https://evil.example/tickets", "/tickets")).toBe("/tickets");
    expect(landingTarget("http://evil.example", "/desk")).toBe("/desk");
    expect(landingTarget("//evil.example/tickets", "/tickets")).toBe("/tickets");
    expect(landingTarget("javascript:alert(1)", "/tickets")).toBe("/tickets");
  });

  it("rejects sibling prefixes and other app areas", () => {
    expect(landingTarget("/tickets.evil", "/tickets")).toBe("/tickets");
    expect(landingTarget("/desk", "/tickets")).toBe("/tickets");
    expect(landingTarget("/sign-in", "/tickets")).toBe("/tickets");
  });

  it("rejects backslash tricks", () => {
    expect(landingTarget("/tickets\\..\\evil", "/tickets")).toBe("/tickets");
    expect(landingTarget("\\evil.example", "/tickets")).toBe("/tickets");
  });
});
