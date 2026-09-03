import { describe, expect, it } from "vitest";

import {
  agentEmailSchema,
  createTicketSchema,
  validateFile,
  validateFiles,
} from "./index";

describe("contracts", () => {
  it("FE-0.3: createTicketSchema rejects short title/description and requires category", () => {
    const result = createTicketSchema.safeParse({
      title: "abcd",
      description: "too short here!!!",
      categoryId: "",
      priority: "medium",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.title?.[0]).toMatch(/at least 5/);
      expect(fields.description?.[0]).toMatch(/at least 20/);
      expect(fields.categoryId?.[0]).toBeDefined();
    }
  });

  it("FE-0.3: agent email must be pearl27.com", () => {
    expect(agentEmailSchema.safeParse({ email: "someone@gmail.com" }).success).toBe(false);
    expect(agentEmailSchema.safeParse({ email: "ada@pearl27.com" }).success).toBe(true);
  });

  it("FE-0.4: attachment rules — size, MIME, count", () => {
    expect(validateFile({ name: "a.exe", size: 100, type: "application/x-msdownload" })).toMatch(
      /only PNG/,
    );
    expect(
      validateFile({ name: "big.png", size: 7 * 1024 * 1024, type: "image/png" }),
    ).toMatch(/too large/);
    const six = Array.from({ length: 6 }, (_, i) => ({
      name: `f${i}.png`,
      size: 100,
      type: "image/png",
    }));
    expect(validateFiles(six)).toContain("Attach at most 5 files");
  });
});
