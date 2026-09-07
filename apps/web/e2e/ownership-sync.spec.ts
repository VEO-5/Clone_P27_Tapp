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

// NOTE: the mock store lives in the browser worker and re-seeds on full page
// reload, so post-mutation assertions use in-app tab clicks (router.replace),
// never page.goto — same as the FE-3.x specs.

// Uniform flow: Unassigned -> Assign to me -> Mine has it, Unassigned loses it.
test("ownership sync: claim leaves Unassigned and lands in Mine", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=unassigned");
  const first = page.locator("article, tr[data-ticket-row]").first();
  await expect(first).toBeVisible();
  const ref = ((await first.getAttribute("aria-label")) ?? "").split(" ")[0]!;
  expect(ref).toMatch(/^PRL-/);
  await first.getByRole("button", { name: /assign .* to me/i }).click();
  await expect(page.getByText("Assigned to you")).toBeVisible();
  // Same page, no reload: the row must vanish from Unassigned immediately.
  await expect(page.getByText(ref)).toHaveCount(0);
  // In-app tab switch (no reload): the ticket is now in Mine with Release.
  await page.getByRole("tab", { name: /^mine$/i }).click();
  await expect(page).toHaveURL(/tab=mine/);
  const mineRow = page.locator("tr[data-ticket-row]", { hasText: ref });
  await expect(mineRow).toBeVisible();
  await expect(mineRow.getByRole("button", { name: /^release$/i })).toBeVisible();
  await expect(mineRow.getByRole("button", { name: /assign .* to me/i })).toHaveCount(0);
});

// Uniform flow: Mine -> Release -> back to Unassigned+Pending, gone from Mine.
test("ownership sync: release leaves Mine and returns to Unassigned", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=mine");
  const row = page.locator("article, tr[data-ticket-row]").first();
  await expect(row).toBeVisible();
  const ref = ((await row.getAttribute("aria-label")) ?? "").split(" ")[0]!;
  expect(ref).toMatch(/^PRL-/);
  await row.getByRole("button", { name: /^release$/i }).click();
  await page.getByRole("button", { name: /^release ticket$/i }).click();
  await expect(page.getByText("Released to unassigned")).toBeVisible();
  await expect(page.getByText(ref)).toHaveCount(0);
  await page.getByRole("tab", { name: /unassigned/i }).click();
  await expect(page).toHaveURL(/tab=unassigned/);
  const backRow = page.locator("tr[data-ticket-row]", { hasText: ref });
  await expect(backRow).toBeVisible();
  await expect(backRow.getByRole("button", { name: /assign .* to me/i })).toBeVisible();
});

// All holds every incoming request: pending + open + in_progress + resolved.
test("tabs: All shows every status", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  await expect(page.locator("article, tr[data-ticket-row]").first()).toBeVisible();
  for (const status of ["Pending", "Open", "In progress"]) {
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  }
  // Resolved sorts last — the status filter proves All includes it.
  await page.goto("/desk/queue?tab=all&status=resolved");
  await expect(page.locator("article, tr[data-ticket-row]").first()).toBeVisible();
  await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
});

// Resolved is terminal: no Release / Assign actions on resolved rows.
test("terminal: resolved rows expose no ownership actions", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all&status=resolved");
  const row = page.locator("article, tr[data-ticket-row]").first();
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: /^release$/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /assign .* to me/i })).toHaveCount(0);
});

// Security: agents never see the admin assign control (server returns 403 too,
// covered hermetically in src/mocks/__tests__/authGates.test.ts).
test("security: agent sees no assign control on another agent's ticket", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/tickets/t-desk-7"); // owned by Ada Osei
  await expect(page.getByText(/locked to ada osei · view only/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /assign…/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^release$/i })).toHaveCount(0);
});

// Admin oversight: By agent with no pick never leaks All.
test("tabs: by-agent without a pick is empty", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/desk/queue?tab=by-agent");
  await expect(page.getByText(/pick an agent|choose an agent/i)).toBeVisible();
});
