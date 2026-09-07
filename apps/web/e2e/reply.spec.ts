import { expect, test } from "@playwright/test";

async function signInAsAgent(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as admin/i }).click();
  await expect(page).toHaveURL(/\/desk\/admin/);
}

// FE-4.8: unassigned ticket auto-claims on send.
test("FE-4.8: send on unassigned assigns to me and opens", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-5");
  await expect(page.getByText(/sending will assign this ticket to you/i)).toBeVisible();
  await page.getByLabel(/message to the employee/i).fill("Looking into the SSO loop now.");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText(/assignee: kofi mensah/i)).toBeVisible();
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Looking into the SSO loop now.")).toBeVisible();
});

// FE-4.9: locked ticket is read-only for agents, stream visible.
test("FE-4.9: locked ticket hides the composer for agents", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-7");
  await expect(page.getByText(/locked to ada osei · view only/i)).toBeVisible();
  await expect(page.getByLabel(/message to the employee/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /assign .* to me/i })).toHaveCount(0);
  await expect(page.getByText(/shared drive still shows access denied/i)).toBeVisible();
});

// FE-4.10: admins keep composer + controls on locked tickets.
test("FE-4.10: admin sees composer and controls on locked tickets", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/desk/tickets/t-desk-7");
  await expect(page.getByLabel(/message to the employee/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^release$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /assign…/i })).toBeVisible();
});

// FE-4.11 + FE-4.12: live message appears, presence shows.
test("FE-4.11/4.12: live message and presence on the open screen", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-1");
  await expect(page.getByText(/dropped twice more this hour/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/ada osei is also viewing/i)).toBeVisible({ timeout: 15000 });
});

// FE-4.13: draft survives reload.
test("FE-4.13: composer draft persists across reload", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-1");
  await page.getByLabel(/message to the employee/i).fill("Half-written reply…");
  await page.reload();
  await expect(page.getByLabel(/message to the employee/i)).toHaveValue("Half-written reply…");
});

// FE-4.14: first open as assignee toasts the transition.
test("FE-4.14: pending-to-open toast on first open", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-12");
  await expect(page.getByText("Ticket is now Open")).toBeVisible({ timeout: 15000 });
});

// FE-4.16: previous-release banner.
test("FE-4.16: previous release banner shows status, agent, time", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-9");
  await expect(page.getByText(/previously in progress · ada osei/i)).toBeVisible();
});

// FE-4.17: 375px stacks composer below the stream.
test("FE-4.17: mobile reply screen stacks", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-1");
  await expect(page.getByRole("button", { name: /send message/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
