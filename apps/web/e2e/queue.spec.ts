import { expect, test } from "@playwright/test";

async function signInAsAgent(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

// FE-3.1: cards + four charts with hidden tables.
test("FE-3.1: agent dashboard renders cards and charts", async ({ page }) => {
  await signInAsAgent(page);
  await expect(page.getByText("Unassigned", { exact: true })).toBeVisible();
  await expect(page.getByText(/received vs resolved/i)).toBeVisible();
  await expect(page.getByText(/my open tickets by status/i)).toBeVisible();
  await expect(page.getByText(/category breakdown/i)).toBeVisible();
  await expect(page.getByText(/ticket age/i)).toBeVisible();
  expect(await page.locator("table").count()).toBeGreaterThanOrEqual(4);
});

// FE-3.2: Unassigned card deep-links into the queue.
test("FE-3.2: unassigned card links to the filtered queue", async ({ page }) => {
  await signInAsAgent(page);
  await page.getByRole("link", { name: /unassigned:/i }).click();
  await expect(page).toHaveURL(/\/desk\/queue\?tab=unassigned/);
});

// FE-3.3: queue defaults to Mine with the agent's tickets.
test("FE-3.3: queue opens on Mine", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue");
  await expect(page.getByRole("tab", { selected: true })).toHaveText(/mine/i);
  await expect(page.getByText(/vpn drops every 20 minutes/i).first()).toBeVisible();
});

// FE-3.4: filters + search live in the URL and survive reload.
test("FE-3.4: filter, search, reload restores", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  await page.getByLabel(/status/i).selectOption("pending");
  await page.getByLabel(/priority/i).selectOption("urgent");
  await page.getByLabel(/search tickets/i).fill("sphere");
  await expect(page).toHaveURL(/status=pending/);
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(page).toHaveURL(/q=sphere/);
  await expect(page.getByText(/sso loop on sphere login/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/sso loop on sphere login/i)).toBeVisible();
  await expect(page).toHaveURL(/status=pending/);
});

// FE-3.5: by-agent shows a locked view with no controls except View.
test("FE-3.5: by-agent Ada is padlocked and read-only", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=by-agent");
  await page.getByLabel(/agent/i).selectOption("u-agent-2");
  await expect(page.getByText(/shared drive permissions/i)).toBeVisible();
  const region = page.locator("article").first();
  await expect(region.getByText(/ada osei/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /assign .* to me/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^release$/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View" }).first()).toBeVisible();
});

// FE-3.14: activity feed renders and the Live indicator connects.
test("FE-3.14: activity feed and live indicator", async ({ page }) => {
  await signInAsAgent(page);
  await expect(page.getByText("Live", { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/assigned to kofi/i).first()).toBeVisible();
});

// FE-3.15: 375px queue is cards with a filters drawer.
test("FE-3.15: mobile queue layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInAsAgent(page);
  await page.goto("/desk/queue");
  await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: /filters/i }).click();
  await expect(page.getByLabel(/status/i)).toBeVisible();
});

// FE-3.17: cursor pagination appends without duplicates.
test("FE-3.17: load more appends unique rows", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  const refs = () => page.locator("article").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label") ?? ""));
  await expect(page.locator("article").first()).toBeVisible();
  const before = await refs();
  await page.getByRole("button", { name: /load more/i }).click();
  await expect(async () => {
    expect((await refs()).length).toBeGreaterThan(before.length);
  }).toPass();
  const after = await refs();
  expect(new Set(after).size).toBe(after.length);
});
