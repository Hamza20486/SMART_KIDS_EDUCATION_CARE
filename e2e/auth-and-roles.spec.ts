import { expect, test } from "@playwright/test";
import { accounts, login, password } from "./support";

test.describe("authentication and role dashboards", () => {
  for (const path of ["/fr/admin", "/fr/parent", "/fr/super-admin"]) {
    test(`redirects anonymous access from ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/fr\/login/);
    });
  }

  test("rejects invalid credentials without leaking account state", async ({ page }) => {
    await page.goto("/fr/login");
    await page.locator('input[name="email"]').fill("unknown@example.test");
    await page.locator('input[name="password"]').fill("WrongPassword123!");
    await page.locator("main form button").first().click();
    await expect(page.locator(".error")).toBeVisible();
    await expect(page).toHaveURL(/\/fr\/login/);
  });

  const dashboards = [
    { role: "admin", email: accounts.admin, path: /\/fr\/admin\/?$/ },
    { role: "manager", email: accounts.manager, path: /\/fr\/admin\/?$/ },
    { role: "teacher", email: accounts.teacher, path: /\/fr\/admin\/?$/ },
    { role: "accountant", email: accounts.accountant, path: /\/fr\/admin\/?$/ },
    { role: "parent", email: accounts.parent, path: /\/fr\/parent\/?$/ },
    {
      role: "super-admin",
      email: accounts.superAdmin,
      path: /\/fr\/super-admin\/?$/,
    },
  ] as const;

  for (const account of dashboards) {
    test(`${account.role} reaches only its dashboard shell`, async ({ page }) => {
      await login(page, account.email, account.path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
    });
  }

  for (const email of [
    "suspended-user@smartkids.ma",
    "inactive-org-user@smartkids.ma",
  ]) {
    test(`denies suspended identity ${email}`, async ({ page }) => {
      await page.goto("/fr/login");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator("main form button").first().click();
      await expect(page.locator(".error")).toBeVisible();
      await expect(page).toHaveURL(/\/fr\/login/);
    });
  }
});
