import { expect, test } from "@playwright/test";

// FE-0.7: app boots with mocks and shows the mock sign-in roles.
test("boots against mocks without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    // Browser network noise ("Failed to load resource" for the expected
    // signed-out /auth/me 401) is not an app error — only real JS errors fail.
    if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) {
      errors.push(msg.text());
    }
  });
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /sphere support/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /continue as ada obi/i }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
