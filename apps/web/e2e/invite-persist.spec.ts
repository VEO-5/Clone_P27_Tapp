import { expect, test } from "@playwright/test";

// Invitees must keep their desk role across page reloads: invites live in
// the mock worker's memory, which resets on restart — the browser journal
// replays them on boot before the session reseed.

const INVITEE = "invitee@pearl27.com";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as admin/i }).click();
  await expect(page).toHaveURL(/\/desk\/admin/);
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /admin@pearl27\.com/i }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
}

test("invite survives reload: invitee stays on the desk, not 403", async ({ page }) => {
  await signInAsAdmin(page);

  // Admin invites a fresh agent.
  await page.goto("/desk/admin/agents");
  await page.getByRole("button", { name: /create agent/i }).click();
  await page.getByRole("textbox", { name: /work email/i }).fill(INVITEE);
  await page.getByRole("button", { name: /send invite/i }).click();
  await expect(page.getByText(`Invite sent to ${INVITEE}`).first()).toBeVisible();

  // Invitee signs in with the invited email — first landing works.
  await signOut(page);
  await page.getByRole("textbox", { name: /work email/i }).fill(INVITEE);
  await page.getByRole("button", { name: /^continue with email$/i }).click();
  await expect(page).toHaveURL(/\/desk/);
  await expect(page.getByText(/you can't open this screen/i)).toHaveCount(0);

  // The reported bug: refresh dropped invitees to employee 403.
  await page.reload();
  await expect(page.getByText(/you can't open this screen/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();

  // Hard case: service worker memory wiped — the journal must restore it.
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  });
  await page.reload();
  await expect(page.getByText(/you can't open this screen/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
});

test("admin grant survives reload: invitee keeps admin, menu shows their email", async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto("/desk/admin/admins");
  await page.getByRole("button", { name: /create admin/i }).click();
  await page.getByRole("textbox", { name: /work email/i }).fill("chief@pearl27.com");
  await page.getByRole("button", { name: /send invite/i }).click();
  await expect(page.getByText("Invite sent to chief@pearl27.com").first()).toBeVisible();

  await signOut(page);
  await page.getByRole("textbox", { name: /work email/i }).fill("chief@pearl27.com");
  await page.getByRole("button", { name: /^continue with email$/i }).click();
  await expect(page).toHaveURL(/\/desk\/admin/);
  // The account menu shows the signed-in admin's own email — never the seed.
  await expect(page.getByRole("button", { name: /chief@pearl27\.com/i })).toBeVisible();

  await page.reload();
  await expect(page.getByText(/you can't open this screen/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /chief@pearl27\.com/i })).toBeVisible();
});
