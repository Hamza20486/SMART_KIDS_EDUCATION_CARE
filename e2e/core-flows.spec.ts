import { expect, test } from "@playwright/test";
import { accounts, login } from "./support";

function dateKey(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

test.describe("core product flows", () => {
  test("parent navigates child, attendance, homework and payment views", async ({
    page,
  }) => {
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    for (const path of [
      "/fr/parent/children",
      "/fr/parent/attendance",
      "/fr/parent/homework",
      "/fr/parent/payments",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page).not.toHaveURL(/login/);
    }
  });

  test("parent submits an absence request", async ({ page }) => {
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    await page.goto("/fr/parent/absences");
    const reason = `E2E absence ${Date.now()}`;
    await page.locator('input[name="startDate"]').fill(dateKey(30));
    await page.locator('input[name="endDate"]').fill(dateKey(31));
    await page.locator('input[name="reason"]').fill(reason);
    const response = page.waitForResponse(
      (item) =>
        item.url().includes("/api/parent/absences") &&
        item.request().method() === "POST",
    );
    await page.locator("main form button").first().click();
    expect((await response).status()).toBe(201);
    await expect(page.getByText(reason)).toBeVisible();
  });

  test("parent creates a complaint", async ({ page }) => {
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    await page.goto("/fr/parent/complaints");
    const subject = `E2E complaint ${Date.now()}`;
    await page.locator('input[name="category"]').fill("Accueil");
    await page.locator('input[name="subject"]').fill(subject);
    await page.locator('input[name="message"]').fill("Message de test Playwright");
    const response = page.waitForResponse(
      (item) =>
        item.url().includes("/api/parent/complaints") &&
        item.request().method() === "POST",
    );
    await page.locator("main form button").first().click();
    expect((await response).status()).toBe(201);
    await expect(page.getByText(subject)).toBeVisible();
  });

  test("teacher records daily attendance for an assigned class", async ({ page }) => {
    await login(page, accounts.teacher, /\/fr\/admin\/?$/);
    await page.goto("/fr/admin/attendance/daily");
    await expect(page.getByText("Yasmine Bennani")).toBeVisible();
    await page.locator("tbody select").first().selectOption("PRESENT");
    const response = page.waitForResponse(
      (item) =>
        item.url().includes("/api/attendance/daily") &&
        item.request().method() === "POST",
    );
    await page
      .locator("button")
      .filter({ hasText: /Enregistrer|Save/ })
      .last()
      .click();
    expect((await response).status()).toBe(200);
  });

  test("manager reviews attendance, absences and complaints", async ({ page }) => {
    await login(page, accounts.manager, /\/fr\/admin\/?$/);
    for (const path of [
      "/fr/admin/attendance",
      "/fr/admin/absences",
      "/fr/admin/complaints",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page).not.toHaveURL(/login/);
    }
  });

  test("accountant reaches payments and financial reports", async ({ page }) => {
    await login(page, accounts.accountant, /\/fr\/admin\/?$/);
    await page.goto("/fr/admin/payments");
    await expect(page.getByText("Yasmine Bennani").first()).toBeVisible();
    await page.goto("/fr/admin/payments/reports");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".report-summary")).toBeVisible();
  });

  test("super-admin creates a SaaS organization", async ({ page }) => {
    await login(page, accounts.superAdmin, /\/fr\/super-admin\/?$/);
    const suffix = Date.now();
    const name = `E2E School ${suffix}`;
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="slug"]').fill(`e2e-school-${suffix}`);
    await page.locator('input[name="city"]').fill("Casablanca");
    await page.locator('input[name="adminName"]').fill("E2E Admin");
    await page
      .locator('input[name="adminEmail"]')
      .fill(`e2e-admin-${suffix}@example.test`);
    await page.locator('input[name="adminPassword"]').fill("E2eSecurePassword123!");
    await page.locator('select[name="planCode"]').selectOption("ESSENTIAL");
    const response = page.waitForResponse(
      (item) =>
        item.url().includes("/api/platform/organizations") &&
        item.request().method() === "POST",
    );
    await page.locator("main form button").first().click();
    expect((await response).status()).toBe(201);
    await expect(page.getByText(name)).toBeVisible();
  });
});
