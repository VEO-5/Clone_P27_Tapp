import { expect, test, type Page } from "@playwright/test";

// Viewport lock: on the desk board the window must never scroll — title,
// stats, and filters stay pinned while only the table frame scrolls.

async function signInAsAgent(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

test("FE-2.20: /desk never scrolls the window — table frame owns the scroll", async ({
  page,
}) => {
  await signInAsAgent(page);
  await page.goto("/desk");
  // Wait for data: without this the metrics below race the dashboard query
  // and read an empty table (0 rows) on loaded machines.
  await page.waitForSelector('table[aria-label="Support tickets"] tbody tr');

  const metrics = await page.evaluate(() => {
    const table = document.querySelector('table[aria-label="Support tickets"]');
    const frame = table?.closest("div");
    if (frame) frame.scrollTop = frame.scrollHeight;
    const content = document.querySelector("div.h-dvh.min-w-0");
    return {
      windowY: window.scrollY,
      contentTop: content ? content.scrollTop : -1,
      frameTop: frame ? frame.scrollTop : -1,
      frameScrollable: frame ? frame.scrollHeight - frame.clientHeight : -1,
      rows: table ? table.querySelectorAll("tbody tr").length : 0,
      headerTop: document.querySelector("h1")?.getBoundingClientRect().top ?? -999,
    };
  });

  expect(metrics.rows).toBeGreaterThan(0);
  expect(metrics.frameScrollable).toBeGreaterThan(0);
  expect(metrics.frameTop).toBeGreaterThan(0);
  expect(metrics.windowY).toBe(0);
  expect(metrics.contentTop).toBe(0);
  // Title stays pinned in view even with the table fully scrolled.
  expect(metrics.headerTop).toBeGreaterThanOrEqual(0);
});
