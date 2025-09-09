import { Page, expect } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await page.fill("input[type='email'], input[name='email']", email);
  await page.fill("input[type='password'], input[name='password']", password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // wait for sidebar/link after login instead of generic navigation role
  await expect(page.getByRole("link", { name: /readiness/i }))
    .toBeVisible({ timeout: 15000 });
}
