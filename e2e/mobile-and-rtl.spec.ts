import { expect, test } from "@playwright/test";
import { accounts, login } from "./support";

test.describe("Arabic RTL and mobile", () => {
  test("Arabic pages use RTL and translated authentication copy", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("main form button").first()).toContainText(/دخول|تسجيل/);
  });

  test("parent dashboard remains usable on a mobile viewport", async ({ page }) => {
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".parent-nav")).toBeVisible();
    const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? bodyWidth;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });
});
