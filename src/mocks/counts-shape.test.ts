import { describe, expect, it } from "vitest";

import { employeeCounts } from "./employee";

/**
 * Locks the /tickets/mine counts contract both sides must honor:
 * exactly {pending, open, inProgress, resolved}, always present.
 * The live backend once returned snake_case page-scoped tallies, which
 * blanked the In-progress card — this shape is the documented truth.
 */
describe("employee counts contract", () => {
  it("returns all four camelCase keys, zero-filled", () => {
    const counts = employeeCounts("u-employee-1");
    expect(Object.keys(counts).sort()).toEqual(["inProgress", "open", "pending", "resolved"]);
    for (const value of Object.values(counts)) {
      expect(typeof value).toBe("number");
    }
  });
});
