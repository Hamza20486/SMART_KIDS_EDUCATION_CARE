import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { fixturePath, type E2EFixture } from "./fixture";

export const password = "SmartKids2026!";
export const accounts = {
  superAdmin: "superadmin@smartkids.ma",
  admin: "admin@smartkids.ma",
  manager: "manager@smartkids.ma",
  teacher: "teacher@smartkids.ma",
  accountant: "accountant@smartkids.ma",
  parent: "parent@smartkids.ma",
} as const;

export async function login(page: Page, email: string, expectedPath: RegExp) {
  await page.goto("/fr/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator("main form button").first().click();
  await page.waitForURL(expectedPath);
}

export async function loadFixture(): Promise<E2EFixture> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as E2EFixture;
}
