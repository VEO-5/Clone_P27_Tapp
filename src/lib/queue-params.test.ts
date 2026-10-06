import { describe, expect, it } from "vitest";

import {
  coerceTabForRole,
  normalizeQueueParams,
  QUEUE_DEFAULTS,
  queueQueryString,
  queueSearchSchema,
  readQueueParams,
} from "./queue-params";

const search = (query: string): URLSearchParams => new URLSearchParams(query);

describe("readQueueParams parity (Next reader semantics)", () => {
  it("returns defaults for an empty query", () => {
    expect(readQueueParams(search(""))).toEqual(QUEUE_DEFAULTS);
  });

  it("accepts each valid tab and rejects invalid ones to mine", () => {
    for (const tab of ["unassigned", "mine", "all", "by-agent"]) {
      expect(readQueueParams(search(`tab=${tab}`)).tab).toBe(tab);
    }
    for (const tab of ["Mine", "ALL", "archived", ""]) {
      expect(readQueueParams(search(`tab=${tab}`)).tab).toBe("mine");
    }
  });

  it("reads every filter field, defaulting sort to newest", () => {
    const params = readQueueParams(
      search("tab=all&assigneeId=a1&status=open&priority=high&categoryId=c1&q=login&sort=oldest"),
    );
    expect(params).toEqual({
      tab: "all",
      assigneeId: "a1",
      status: "open",
      priority: "high",
      categoryId: "c1",
      q: "login",
      sort: "oldest",
    });
  });

  it("keeps assigneeId in state even outside by-agent (serializer decides)", () => {
    expect(readQueueParams(search("tab=all&assigneeId=a1")).assigneeId).toBe("a1");
  });
});

describe("queueQueryString parity (Next serializer semantics)", () => {
  it("serializes defaults to just ?tab=mine", () => {
    expect(queueQueryString(QUEUE_DEFAULTS)).toBe("?tab=mine");
  });

  it("emits assigneeId only on the by-agent tab", () => {
    expect(queueQueryString({ ...QUEUE_DEFAULTS, tab: "by-agent", assigneeId: "a1" })).toBe(
      "?tab=by-agent&assigneeId=a1",
    );
    expect(queueQueryString({ ...QUEUE_DEFAULTS, tab: "all", assigneeId: "a1" })).toBe("?tab=all");
  });

  it("omits default-valued keys and keeps non-defaults", () => {
    expect(queueQueryString({ ...QUEUE_DEFAULTS, tab: "all", sort: "newest" })).toBe("?tab=all");
    expect(queueQueryString({ ...QUEUE_DEFAULTS, tab: "all", q: "vpn", sort: "due" })).toBe(
      "?tab=all&q=vpn&sort=due",
    );
  });

  it("round-trips through the reader", () => {
    const params = {
      ...QUEUE_DEFAULTS,
      tab: "by-agent" as const,
      assigneeId: "a9",
      status: "open",
      q: "sphere",
    };
    expect(readQueueParams(search(queueQueryString(params).slice(1)))).toEqual(params);
  });
});

describe("validateSearch schema (TanStack layer)", () => {
  it("rejects invalid tab to mine instead of crashing", () => {
    expect(queueSearchSchema.parse({ tab: "archived" }).tab).toBe("mine");
  });

  it("fills every missing key with reader-identical defaults", () => {
    expect(queueSearchSchema.parse({})).toEqual(QUEUE_DEFAULTS);
  });

  it("strips unknown keys", () => {
    expect(queueSearchSchema.parse({ tab: "all", evil: "1" })).toEqual({
      ...QUEUE_DEFAULTS,
      tab: "all",
    });
  });

  it("normalizeQueueParams matches the reader on tricky input", () => {
    expect(normalizeQueueParams({ tab: 42, sort: null })).toEqual(QUEUE_DEFAULTS);
    expect(normalizeQueueParams({ tab: "open", q: "x" })).toEqual({ ...QUEUE_DEFAULTS, q: "x" });
  });
});

describe("admin tab coercion", () => {
  it("bounces admins from mine to all, leaves everything else alone", () => {
    expect(coerceTabForRole({ ...QUEUE_DEFAULTS, tab: "mine" }, true).tab).toBe("all");
    expect(coerceTabForRole({ ...QUEUE_DEFAULTS, tab: "mine" }, false).tab).toBe("mine");
    expect(coerceTabForRole({ ...QUEUE_DEFAULTS, tab: "all" }, true).tab).toBe("all");
  });
});
