import { describe, expect, it } from "vitest";

import { createTicketSchema, validateFile, validateFiles } from "../validation";

const valid = {
  employeeName: "  Godstime Erubami  ",
  employeeEmail: "Godstime@Pearl27.com",
  title: "  Cannot sign in to Sphere  ",
  description: "  I tried to sign in this morning and the app returned an unknown error after MFA.  ",
  category: "account_access",
  priority: "high",
};

describe("createTicketSchema", () => {
  it("U1: accepts a valid payload and normalises email + whitespace", () => {
    const parsed = createTicketSchema.parse(valid);
    expect(parsed.employeeName).toBe("Godstime Erubami");
    expect(parsed.employeeEmail).toBe("godstime@pearl27.com");
    expect(parsed.title).toBe("Cannot sign in to Sphere");
    expect(parsed.description.startsWith("I tried")).toBe(true);
  });

  it("U2: missing name / email / title / description each produce a field-level error", () => {
    const fields = ["employeeName", "employeeEmail", "title", "description"] as const;
    for (const field of fields) {
      const result = createTicketSchema.safeParse({ ...valid, [field]: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes(field))).toBe(true);
      }
    }
  });

  it("U3: rejects a malformed email", () => {
    const result = createTicketSchema.safeParse({ ...valid, employeeEmail: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("valid email"))).toBe(true);
    }
  });

  it("U4: rejects a title over 140 chars and a description over 5000 chars", () => {
    const longTitle = createTicketSchema.safeParse({ ...valid, title: "x".repeat(141) });
    const longDescription = createTicketSchema.safeParse({
      ...valid,
      description: "x".repeat(5001),
    });
    expect(longTitle.success).toBe(false);
    expect(longDescription.success).toBe(false);
  });

  it("U5: unknown category or priority falls back to the schema default", () => {
    const parsed = createTicketSchema.parse({
      ...valid,
      category: "not-a-category",
      priority: "not-a-priority",
    });
    expect(parsed.category).toBe("other");
    expect(parsed.priority).toBe("medium");
  });
});

describe("attachments", () => {
  it("U6: rejects a file over 5 MB with a size message", () => {
    const error = validateFile({
      name: "huge.png",
      size: 7 * 1024 * 1024,
      type: "image/png",
    });
    expect(error).toMatch(/limit/i);
  });

  it("U7: rejects a disallowed MIME type", () => {
    const error = validateFile({
      name: "payload.exe",
      size: 1024,
      type: "application/x-msdownload",
    });
    expect(error).toMatch(/allowed/i);
  });

  it("U8: rejects more than 5 files", () => {
    const files = Array.from({ length: 6 }, (_, index) => ({
      name: `shot-${index}.png`,
      size: 1024,
      type: "image/png",
    }));
    expect(validateFiles(files).some((message) => /at most 5/i.test(message))).toBe(true);
  });

  it("U9: accepts PNG / JPEG / WebP / PDF under the limit", () => {
    const files = [
      { name: "a.png", size: 1024, type: "image/png" },
      { name: "b.jpg", size: 1024, type: "image/jpeg" },
      { name: "c.webp", size: 1024, type: "image/webp" },
      { name: "d.pdf", size: 2048, type: "application/pdf" },
    ];
    expect(validateFiles(files)).toEqual([]);
  });
});
