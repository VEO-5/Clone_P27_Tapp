import { describe, expect, it } from "vitest";

import {
  REFERENCE_PATTERN,
  generateReference,
  isValidReference,
  normaliseReference,
} from "../reference";

describe("reference", () => {
  it("U10: matches PRL-[A-Z2-9]{6} and excludes ambiguous O/0/I/1", () => {
    const reference = generateReference();
    expect(reference).toMatch(REFERENCE_PATTERN);
    expect(reference.slice(4)).not.toMatch(/[O0I1]/);
    expect(isValidReference("prl-7k4m2x")).toBe(true);
    expect(normaliseReference("  prl-7k4m2x  ")).toBe("PRL-7K4M2X");
  });

  it("U11: 2000 generated references contain no duplicates", () => {
    const set = new Set(Array.from({ length: 2000 }, () => generateReference()));
    expect(set.size).toBe(2000);
  });
});
