import { describe, expect, it, vi, beforeEach } from "vitest";

import { ApiError, apiFetch } from "@/lib/api";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("lib/api", () => {
  it("FE-0.1: 400 with code + fieldErrors throws ApiError intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(400, {
          error: { code: "VALIDATION_FAILED", message: "Bad input", fieldErrors: { title: "Too short" } },
        }),
      ),
    );
    try {
      await apiFetch("/tickets");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("VALIDATION_FAILED");
      expect(apiError.fieldErrors).toEqual({ title: "Too short" });
    }
  });

  it("FE-0.2: 401 throws UNAUTHENTICATED so caller can redirect", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(401, {})));
    try {
      await apiFetch("/auth/me");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("UNAUTHENTICATED");
      expect((error as ApiError).isUnauthenticated).toBe(true);
    }
  });

  it("sends session cookie via credentials:include", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch("/auth/me");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(init).toMatchObject({ credentials: "include" });
  });
});
