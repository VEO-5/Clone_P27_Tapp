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

// FE-3.1a: agents see only Unassigned / Mine / All — no By agent tab.
test("FE-3.1a: agent queue tabs exclude By agent", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  await expect(page.getByRole("tab", { name: /unassigned/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^mine$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^all$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /by agent/i })).toHaveCount(0);
});

// FE-3.1: stat cards + flat ticket grid.
test("FE-3.1: agent dashboard renders stat cards and grid", async ({ page }) => {
  await signInAsAgent(page);
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  await expect(page.getByText(/total tickets/i).first()).toBeVisible();
  await expect(page.getByLabel("Tickets grid")).toBeVisible();
  await expect(page.getByText("Unassigned", { exact: true })).toBeVisible();
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
  await page.getByLabel(/status/i).click();
  await page.getByRole("option", { name: "Pending", exact: true }).click();
  await page.getByLabel(/priority/i).click();
  await page.getByRole("option", { name: "Urgent", exact: true }).click();
  await page.getByLabel(/search tickets/i).fill("sphere");
  await expect(page).toHaveURL(/status=pending/);
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(page).toHaveURL(/q=sphere/);
  await expect(page.getByText(/sso loop on sphere login/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/sso loop on sphere login/i)).toBeVisible();
  await expect(page).toHaveURL(/status=pending/);
});

// FE-3.5: by-agent is admin-only oversight of an agent's queue.
test("FE-3.5: admin can inspect Ada's queue via by-agent", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/desk/queue?tab=all");
  await expect(page.getByRole("tab", { name: /by agent/i })).toBeVisible();
  await page.getByRole("tab", { name: /by agent/i }).click();
  await page.getByLabel(/agent/i).click();
  await page.getByRole("option", { name: /ada osei/i }).click();
  await expect(page.getByText(/shared drive permissions/i)).toBeVisible();
  const row = page.locator("article, tr[data-ticket-row]").first();
  await expect(row).toBeVisible();
  await expect(page.getByRole("button", { name: /assign .* to me/i })).toHaveCount(0);
  // Row title links into the ticket detail (no separate View button).
  await expect(row.getByRole("link").first()).toBeVisible();
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

// FE-3.17: infinite scroll appends without duplicates + end marker shows.
test("FE-3.17: scrolling loads the full list without duplicates", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  // Desktop table rows only (mobile cards render hidden alongside).
  const rows = () => page.locator("tr[data-ticket-row]");
  const refs = () => rows().evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label") ?? ""));
  await expect(rows().first()).toBeVisible();
  expect((await refs()).length).toBe(12);
  await rows().last().scrollIntoViewIfNeeded();
  await expect(async () => {
    expect((await refs()).length).toBe(16);
  }).toPass();
  const after = await refs();
  expect(new Set(after).size).toBe(after.length);
  await expect(page.getByText(/you're all caught up/i).first()).toBeVisible();
});
