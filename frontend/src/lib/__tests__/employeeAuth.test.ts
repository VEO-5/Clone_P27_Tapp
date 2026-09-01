import { describe, expect, it } from "vitest";

import { createEmployeeToken, verifyEmployeeToken } from "../employeeAuth";

describe("employeeAuth", () => {
  it("signs and verifies an email session, including addresses with dots", () => {
    const token = createEmployeeToken("Godstime.Erubami@pearl27.com");
    const session = verifyEmployeeToken(token);
    expect(session?.email).toBe("godstime.erubami@pearl27.com");
    expect(session!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects a tampered or expired employee token", () => {
    const token = createEmployeeToken("you@pearl27.com");
    const [subject, expiry, signature] = token.split(".");
    expect(verifyEmployeeToken(`${subject}.${Number(expiry) + 1}.${signature}`)).toBeNull();
    expect(verifyEmployeeToken(createEmployeeToken("you@pearl27.com", -30))).toBeNull();
  });
});
