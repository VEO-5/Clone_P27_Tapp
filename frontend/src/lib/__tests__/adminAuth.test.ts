import { describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "../adminAuth";

describe("adminAuth", () => {
  it("U12: a signed session token verifies successfully", () => {
    const token = createSessionToken();
    const claims = verifySessionToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.subject).toBe("support");
    expect(claims!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("U13: a tampered payload or signature fails verification", () => {
    const token = createSessionToken();
    const [subject, expiry, signature] = token.split(".");
    expect(verifySessionToken(`${subject}.${Number(expiry) + 1}.${signature}`)).toBeNull();
    expect(verifySessionToken(`${subject}.${expiry}.not-a-real-signature`)).toBeNull();
  });

  it("U14: an expired token fails verification", () => {
    const expired = createSessionToken("support", -30);
    expect(verifySessionToken(expired)).toBeNull();
  });
});
