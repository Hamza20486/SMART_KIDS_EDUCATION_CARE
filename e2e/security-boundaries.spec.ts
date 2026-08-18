import { expect, test } from "@playwright/test";
import { accounts, loadFixture, login } from "./support";

test.describe("HTTP security boundaries", () => {
  test("Organization A and Parent A cannot read Organization B's child", async ({
    page,
  }) => {
    const fixture = await loadFixture();
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    const own = await page.request.get(`/api/children/${fixture.childId}`);
    expect(own.status()).toBe(200);
    const foreign = await page.request.get(
      `/api/children/${fixture.foreignChildId}`,
    );
    expect(foreign.status()).toBe(403);
  });

  test("teacher can read an assigned child but not an unassigned class", async ({
    page,
  }) => {
    const fixture = await loadFixture();
    await login(page, accounts.teacher, /\/fr\/admin\/?$/);
    expect((await page.request.get(`/api/children/${fixture.childId}`)).status()).toBe(
      200,
    );
    expect(
      (await page.request.get(`/api/classes/${fixture.unassignedClassId}`)).status(),
    ).toBe(403);
  });

  test("accountant cannot read complaints or medical details", async ({ page }) => {
    const fixture = await loadFixture();
    await login(page, accounts.accountant, /\/fr\/admin\/?$/);
    expect((await page.request.get("/api/complaints")).status()).toBe(403);
    const child = await page.request.get(`/api/children/${fixture.childId}`);
    expect(child.status()).toBe(200);
    const body = await child.json();
    expect(body).not.toHaveProperty("allergies");
    expect(body).not.toHaveProperty("notes");
    expect(body).not.toHaveProperty("payments");
  });

  test("parent cannot invoke staff APIs", async ({ page }) => {
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    expect((await page.request.get("/api/staff")).status()).toBe(403);
    expect(
      (
        await page.request.post("/api/classes", {
          data: { name: "Unauthorized", capacity: 10 },
        })
      ).status(),
    ).toBe(403);
  });

  test("super-admin can manage platform data but cannot inspect child data", async ({
    page,
  }) => {
    await login(page, accounts.superAdmin, /\/fr\/super-admin\/?$/);
    expect((await page.request.get("/api/platform/plans")).status()).toBe(200);
    expect((await page.request.get("/api/children")).status()).toBe(403);
  });

  test("private files require authentication, tenant access, visibility and consent", async ({
    page,
  }) => {
    const fixture = await loadFixture();
    expect(
      (await page.request.get(`/api/activity-media/${fixture.privateMediaId}`)).status(),
    ).toBe(403);
    await login(page, accounts.parent, /\/fr\/parent\/?$/);
    expect(
      (await page.request.get(`/api/activity-media/${fixture.privateMediaId}`)).status(),
    ).toBe(403);
  });
});
