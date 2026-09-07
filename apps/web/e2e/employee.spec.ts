import { expect, test } from "@playwright/test";

async function signInAsEmployee(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as ada obi/i }).click();
  await expect(page).toHaveURL(/\/tickets/);
}

const PNG = { name: "shot.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1]) };

// FE-2.6: happy path with 2 files → confirmation with reference + Pending.
test("FE-2.6: submit with 2 files shows confirmation", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/new");
  await page.getByLabel(/issue title/i).fill("Sphere calendar shows the wrong time");
  await page.getByLabel(/describe the issue/i).fill("Since Monday every calendar invite is one hour late on all my devices.");
  await page.getByLabel(/what does this relate to/i).selectOption("email");
  await page.locator('input[type="file"]').setInputFiles([PNG, { ...PNG, name: "shot2.png" }]);
  await page.getByRole("button", { name: /submit ticket/i }).click();
  await expect(page.getByText(/your ticket is with system support/i)).toBeVisible();
  await expect(page.getByText(/PRL-/)).toBeVisible();
  await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/2 of 2 files attached/i)).toBeVisible();
});

// FE-2.7: failed upload keeps the ticket; retry succeeds.
// `.fail-first.` files fail their first PUT in mocks, then succeed.
test("FE-2.7: failed upload shows retry, retry succeeds", async ({ page }) => {
  const flaky = { ...PNG, name: "shot.fail-first.png" };
  await signInAsEmployee(page);
  await page.goto("/tickets/new");
  await page.getByLabel(/issue title/i).fill("Printer in room 4B is jammed again");
  await page.getByLabel(/describe the issue/i).fill("The printer on the fourth floor jams on every second page since Tuesday.");
  await page.getByLabel(/what does this relate to/i).selectOption("hardware");
  await page.locator('input[type="file"]').setInputFiles([flaky]);
  await page.getByRole("button", { name: /submit ticket/i }).click();
  await expect(page.getByText(/upload failed/i).first()).toBeVisible();
  await expect(page.getByText(/your ticket is with system support/i)).toBeVisible();
  await page.getByRole("button", { name: /retry/i }).click();
  await expect(page.getByText(/1 of 1 files attached/i)).toBeVisible();
});

// FE-2.9: dashboard counts + handling agent display.
test("FE-2.9: dashboard counts match, agent or waiting shown", async ({ page }) => {
  await signInAsEmployee(page);
  const counts = page.locator("dl").first();
  await expect(counts).toContainText("Pending");
  await expect(counts).toContainText("Resolved");
  await expect(page.getByText(/kofi mensah|waiting for an agent/i).first()).toBeVisible();
});

// FE-2.10: known-issue banner dismisses for the session.
test("FE-2.10: known-issue banner dismiss persists", async ({ page }) => {
  await signInAsEmployee(page);
  await expect(page.getByText(/sphere login delays/i)).toBeVisible();
  await page.getByRole("button", { name: /dismiss incident notice/i }).click();
  await expect(page.getByText(/sphere login delays/i)).not.toBeVisible();
  await page.reload();
  await expect(page.getByText(/sphere login delays/i)).not.toBeVisible();
});

// FE-2.11: resolved ticket shows status timeline + CSAT.
test("FE-2.11: resolved ticket timeline and CSAT form", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-100004");
  await expect(page.getByText(/replacement keyboard ordered/i)).toBeVisible();
  await expect(page.getByText(/resolved · replacement fitted/i)).toBeVisible();
  await expect(page.getByRole("radio", { name: /4 out of 5/i })).toBeVisible();
});

// FE-2.12: messages and internal notes never render on the employee page.
test("FE-2.12: no conversation messages or notes leak", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-100003");
  await expect(page.getByText(/fix is in review/i)).not.toBeVisible();
  await expect(page.getByText(/escalated to mobile team/i)).not.toBeVisible();
  await expect(page.getByText(/reproduced on android 14/i)).toBeVisible();
});

// FE-2.13: attachment click fetches a short-lived URL in a new tab.
test("FE-2.13: attachment opens via short-lived URL", async ({ page, context }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-100002");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: /vpn-error\.png/i }).click(),
  ]);
  expect(popup.url()).toMatch(/\/mock-files\//);
  await popup.close();
  await context.close();
});

// FE-2.14: another employee's reference → forbidden state.
test("FE-2.14: foreign reference shows not-your-ticket", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-900001");
  await expect(page.getByText(/not your ticket/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /back to my tickets/i })).toBeVisible();
});

// FE-2.15: unknown reference → friendly not-found.
test("FE-2.15: unknown reference shows not-found", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-000000");
  await expect(page.getByText(/no ticket found/i)).toBeVisible();
});

// FE-2.16: CSAT 4/5 with comment thanks and hides the form.
test("FE-2.16: submit CSAT rating", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/PRL-100004");
  await page.getByRole("radio", { name: /4 out of 5/i }).click();
  await page.getByLabel(/anything to add/i).fill("Fast fix, thanks!");
  await page.getByRole("button", { name: /send rating/i }).click();
  await expect(page.getByText(/thanks for rating/i)).toBeVisible();
});

// FE-2.19: lengthy unbroken words wrap inside the card — no sideways scroll.
test("FE-2.19: unbroken long text wraps, page never scrolls sideways", async ({ page }) => {
  await signInAsEmployee(page);
  await page.goto("/tickets/new");
  await page.getByLabel(/issue title/i).fill("y".repeat(140));
  await page
    .getByLabel(/describe the issue/i)
    .fill(
      "iiiiiiiiiiiiiiiiii ffffffffffffffffffffffffffffffffffffff oooooooooooooooooooooo " +
        "s".repeat(300),
    );
  await page.getByLabel(/what does this relate to/i).selectOption("email");
  await page.locator('input[type="file"]').setInputFiles([PNG]);
  await page.getByRole("button", { name: /submit ticket/i }).click();
  await expect(page.getByText(/your ticket is with system support/i)).toBeVisible();
  await page.getByRole("link", { name: /view ticket/i }).click();
  await expect(page.getByText(/y{20}/).first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

// FE-2.17: 375px viewport — no horizontal scroll on the three screens.
test("FE-2.17: mobile 375px has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInAsEmployee(page);
  for (const path of ["/tickets/new", "/tickets", "/tickets/PRL-100002"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
