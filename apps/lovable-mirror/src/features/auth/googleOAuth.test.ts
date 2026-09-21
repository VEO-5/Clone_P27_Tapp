import { describe, expect, it } from "vitest";

import {
  isFreshOAuthAttempt,
  OAUTH_ATTEMPT_TTL_MS,
  oauthStartMessage,
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
