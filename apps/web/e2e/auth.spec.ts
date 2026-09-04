import { expect, test } from "@playwright/test";

// Mock-mode auth flows (NEXT_PUBLIC_API_MOCK=true): role buttons stand in
// for Google SSO until the API ships.

test("FE-1.1: signed-out /desk redirects to /sign-in?next=/desk, then mock sign-in lands on /desk", async ({
  page,
}) => {
  await page.goto("/desk");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdesk/);
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
});

test("FE-1.2: employee visiting /desk sees the 403 screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as ada obi/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
  await page.goto("/desk");
  await expect(page.getByText(/you can't open this screen/i)).toBeVisible();
});

test("FE-1.3: admin lands on /admin with Desk and Admin nav", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as admin/i }).click();
  await expect(page).toHaveURL(/\/admin/);
});

test("FE-1.4: /auth/denied explains the domain rule", async ({ page }) => {
  await page.goto("/auth/denied?reason=domain");
  await expect(page.getByText(/pearl27.*accounts only/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /try another account/i })).toBeVisible();
});

test("FE-1.8: sign out returns to /sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as ada obi/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
