import { describe, expect, it } from "vitest";

import {
  exchangeErrorMessage,
  isFreshOAuthAttempt,
  OAUTH_ATTEMPT_TTL_MS,
  oauthStartMessage,
  parseOAuthReturn,
} from "./googleOAuth";

// Guards the "never a silent sit on the sign-in page" invariant: the OAuth
// attempt flag is the only signal that survives the SDK stripping
// ?insforge_code= at import time, so its freshness math must be exact.
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

describe("parseOAuthReturn", () => {
  it("reads code and error params", () => {
    expect(parseOAuthReturn("?insforge_code=abc123")).toEqual({ code: "abc123", error: null });
    expect(parseOAuthReturn("?error=access_denied")).toEqual({ code: null, error: "access_denied" });
  });

  it("returns empty for plain sign-in visits", () => {
    expect(parseOAuthReturn("")).toEqual({ code: null, error: null });
    expect(parseOAuthReturn("?next=%2Fdesk")).toEqual({ code: null, error: null });
  });

  it("trims blanks and survives garbage", () => {
    expect(parseOAuthReturn("?insforge_code=%20%20")).toEqual({ code: null, error: null });
    expect(parseOAuthReturn("%%%")).toEqual({ code: null, error: null });
  });
});

describe("exchangeErrorMessage", () => {
  it("explains a lost PKCE verifier", () => {
    expect(exchangeErrorMessage({ error: "PKCE_VERIFIER_MISSING", message: "x", statusCode: 400 })).toContain(
      "expired before completing",
    );
  });

  it("surfaces backend message plus guidance", () => {
    const message = exchangeErrorMessage({
      message: "Invalid code",
      statusCode: 400,
      error: "INVALID_CODE",
      nextActions: "Start again.",
    });
    expect(message).toContain("Invalid code");
    expect(message).toContain("Start again.");
  });

  it("falls back when empty", () => {
    expect(exchangeErrorMessage(null)).toBe("Google sign-in didn't complete. Try again.");
  });
});
describe("oauthStartMessage", () => {
  it("falls back when the error carries nothing useful", () => {
    expect(oauthStartMessage(null)).toBe("Couldn't start Google sign-in. Try again.");
    expect(oauthStartMessage({})).toBe("Couldn't start Google sign-in. Try again.");
  });

  it("appends backend guidance for rejected redirect URLs", () => {
    const message = oauthStartMessage({
      message: "Redirect URI not allowed: https://x/sign-in",
      statusCode: 400,
      nextActions: "Add it to allowedRedirectUrls.",
    });
    expect(message).toContain("Redirect URI not allowed");
    expect(message).toContain("Add it to allowedRedirectUrls.");
  });

  it("does not append guidance for non-400 errors", () => {
    const message = oauthStartMessage({ message: "Boom", statusCode: 500, nextActions: "Nope." });
    expect(message).toBe("Boom");
  });
});
