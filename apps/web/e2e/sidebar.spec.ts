import { expect, test } from "@playwright/test";

// Diagnostic spec for: "sidebar moves upward when the page is scrolled and
// the profile (sign-out) menu is opened". Uses realistic input (wheel scroll,
// real clicks) and logs the sidebar box + scroll state at every step.

async function signInAsAgent(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as kofi mensah/i }).click();
  await expect(page).toHaveURL(/\/desk/);
}

async function snapshot(page: import("@playwright/test").Page, label: string) {
  const data = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Desk sidebar"]');
    const rect = aside?.getBoundingClientRect();
    const style = aside ? window.getComputedStyle(aside) : null;
    return {
      box: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      position: style?.position ?? null,
      scrollY: window.scrollY,
      viewportH: window.innerHeight,
      bodyOverflow: document.body.style.overflow || window.getComputedStyle(document.body).overflow,
      scrollLocked: document.body.hasAttribute("data-scroll-locked"),
    };
  });
  // eslint-disable-next-line no-console
  console.log(`[sidebar-probe] ${label}: ${JSON.stringify(data)}`);
  return data;
}

test("diagnose sidebar movement on scroll + profile menu", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/desk/queue?tab=all");
  const sidebar = page.locator('aside[aria-label="Desk sidebar"]');
  await expect(sidebar).toBeVisible();

  const states: Array<{ label: string; box: { x: number; y: number; width: number; height: number } | null }> = [];
  const record = async (label: string) => {
    const s = await snapshot(page, label);
    states.push({ label, box: s.box });
  };

  await record("initial");
  // Realistic scroll: mouse wheel, several notches (smooth-scroll animates).
  await page.mouse.move(640, 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(800);
  await record("after-wheel-scroll");

  // Open the profile menu with a real click.
  await sidebar.getByRole("button", { name: /kofi mensah/i }).click();
  await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible();
  await page.waitForTimeout(500);
  await record("menu-open");

  // Close and watch for scroll restoration jumps.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await record("menu-closed");

  const base = states[0]!.box!;
  for (const s of states) {
    expect(s.box?.x, `${s.label}: sidebar x moved`).toBe(base.x);
    expect(s.box?.y, `${s.label}: sidebar y moved`).toBe(base.y);
    expect(s.box?.width, `${s.label}: sidebar width changed`).toBe(base.width);
    expect(s.box?.height, `${s.label}: sidebar height changed`).toBe(base.height);
  }
});
