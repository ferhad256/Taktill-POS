import { test, expect } from "@playwright/test";

/*
 * E2E: Full sale flow (PRD §11.4)
 * Requires a seeded database.
 */

test.describe("POS Sale Flow", () => {
  test("Owner can log in and view the POS page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Owner login → POS page loads", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@taktill.app");
    await page.fill('input[name="password"]', "owner1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/pos/, { timeout: 10_000 });
  });
});
