import { describe, expect, it } from "vitest";

import {
  assertWorkEmail,
  exchangeErrorMessage,
  isFreshOAuthAttempt,
  OAUTH_ATTEMPT_TTL_MS,
  oauthStartMessage,
  parseOAuthReturn,
  shouldShowOAuthLoader,
} from "./supabase-auth";

// Guards the "never a silent sit on the sign-in page" invariant: the OAuth
// attempt flag is the only signal that survives the round-trip to Google, so
// its freshness math must be exact.
describe("isFreshOAuthAttempt", () => {
  const NOW = 1_800_000_000_000;

  it("rejects missing and garbage values", () => {
    expect(isFreshOAuthAttempt(null, NOW)).toBe(false);
    expect(isFreshOAuthAttempt("", NOW)).toBe(false);
    expect(isFreshOAuthAttempt("not-a-number", NOW)).toBe(false);
    expect(isFreshOAuthAttempt("0", NOW)).toBe(false);
    expect(isFreshOAuthAttempt("-5", NOW)).toBe(false);
  });

  it("accepts a recent attempt", () => {
    expect(isFreshOAuthAttempt(String(NOW - 60_000), NOW)).toBe(true);
    expect(isFreshOAuthAttempt(String(NOW), NOW)).toBe(true);
  });

  it("rejects a stale attempt past the TTL", () => {
    expect(isFreshOAuthAttempt(String(NOW - OAUTH_ATTEMPT_TTL_MS), NOW)).toBe(false);
    expect(isFreshOAuthAttempt(String(NOW - OAUTH_ATTEMPT_TTL_MS - 1), NOW)).toBe(false);
  });

  it("tolerates minor clock skew but not far-future values", () => {
    expect(isFreshOAuthAttempt(String(NOW + 30_000), NOW)).toBe(true);
    expect(isFreshOAuthAttempt(String(NOW + 600_000), NOW)).toBe(false);
  });
});

describe("parseOAuthReturn (Supabase ?code= flow)", () => {
  it("reads code and error params", () => {
    expect(parseOAuthReturn("?code=abc123")).toEqual({ code: "abc123", error: null });
    expect(parseOAuthReturn("?error=access_denied")).toEqual({ code: null, error: "access_denied" });
  });

  it("returns empty for plain sign-in visits", () => {
    expect(parseOAuthReturn("")).toEqual({ code: null, error: null });
    expect(parseOAuthReturn("?next=%2Fdesk")).toEqual({ code: null, error: null });
  });

  it("trims blanks and survives garbage", () => {
    expect(parseOAuthReturn("?code=%20%20")).toEqual({ code: null, error: null });
    expect(parseOAuthReturn("%%%")).toEqual({ code: null, error: null });
  });
});

describe("shouldShowOAuthLoader", () => {
  it("shows takeover for an OAuth return even without a flag", () => {
    expect(shouldShowOAuthLoader("?code=abc", false)).toBe(true);
    expect(shouldShowOAuthLoader("?error=access_denied", false)).toBe(true);
  });

  it("shows takeover for a fresh attempt even after params are consumed", () => {
    expect(shouldShowOAuthLoader("", true)).toBe(true);
    expect(shouldShowOAuthLoader("?next=%2Fdesk", true)).toBe(true);
  });

  it("shows the plain form for normal visits", () => {
    expect(shouldShowOAuthLoader("", false)).toBe(false);
    expect(shouldShowOAuthLoader("?next=%2Fdesk", false)).toBe(false);
  });
});

describe("assertWorkEmail", () => {
  it("accepts work addresses (normalized)", () => {
    expect(assertWorkEmail("Ada@pearl27.com ")).toBe("ada@pearl27.com");
  });

  it("rejects non-work addresses", () => {
    expect(() => assertWorkEmail("ada@gmail.com")).toThrow(/pearl27\.com/);
    expect(() => assertWorkEmail("not-an-email")).toThrow();
    expect(() => assertWorkEmail("")).toThrow();
  });
});

describe("oauth error messages", () => {
  it("surfaces start failures with a fallback", () => {
    expect(oauthStartMessage({ message: "redirect not allowed" })).toBe("redirect not allowed");
    expect(oauthStartMessage(null)).toMatch(/Try again/);
  });

  it("explains expired PKCE flows", () => {
    expect(exchangeErrorMessage({ code: "PKCE_VERIFIER_MISSING" })).toMatch(/expired/);
    expect(exchangeErrorMessage({ message: "boom" })).toBe("boom");
    expect(exchangeErrorMessage(null)).toMatch(/Try again/);
  });
});
