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
  // Content — not just URL — proves the worker serves the agent role.
  // (Scoped to heading: production builds mirror titles into a route announcer.)
  await expect(page.getByRole("heading", { name: /welcome, kofi/i })).toBeVisible();
});

test("FE-1.2: employee visiting /desk sees the 403 screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as ada obi/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
  await page.goto("/desk");
  await expect(page.getByText(/you can't open this screen/i)).toBeVisible();
});

test("FE-1.3: admin lands on /desk/admin and reaches agent management in-shell", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as admin/i }).click();
  await expect(page).toHaveURL(/\/desk\/admin/);
  // Management dashboard is the admin landing (header hidden by design).
  await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
  // Desk sidebar stays mounted — drill into Administration, no shell swap.
  await expect(page.getByRole("navigation", { name: /desk navigation/i })).toBeVisible();
  await page.getByRole("button", { name: /administration/i }).click();
  await page.getByRole("link", { name: "Agents" }).click();
  await expect(page).toHaveURL(/\/desk\/admin\/agents/);
  await expect(page.getByRole("heading", { name: /agent management/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agents" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: /desk navigation/i })).toBeVisible();
});

test("FE-1.3b: agent visiting /desk/admin/agents sees the 403 screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
  await page.goto("/desk/admin/agents");
  await expect(page.getByText(/you can't open this screen/i)).toBeVisible();
});

test("FE-1.4: /auth/denied explains the domain rule", async ({ page }) => {
  await page.goto("/auth/denied?reason=domain");
  await expect(page.getByText(/pearl27.*accounts only/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /try another account/i })).toBeVisible();
});

test("FE-1.8: sign out returns to /sign-in and stays out after reload", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as ada obi/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  // Regression: refresh must not resurrect the session (zombie sign-in).
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible();
  await expect(page.getByText(/ada@pearl27\.com/)).not.toBeVisible();
});

test("FE-1.9: email sign-in — company address lands as employee, foreign rejected", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel(/work email/i).fill("newhire@pearl27.com");
  await page.getByRole("button", { name: /continue with email/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel(/work email/i).fill("someone@gmail.com");
  await page.getByRole("button", { name: /continue with email/i }).click();
  await expect(page.getByRole("alert")).toContainText(/pearl27\.com/i);
  await expect(page).toHaveURL(/\/sign-in/);
});
