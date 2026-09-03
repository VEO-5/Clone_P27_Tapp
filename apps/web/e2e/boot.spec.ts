import { expect, test } from "@playwright/test";

// FE-0.7: app boots with mocks; header shows nav for a mocked employee.
test("boots against mocks without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sphere support/i })).toBeVisible();
  expect(errors).toEqual([]);
});
