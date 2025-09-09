// e2e/readiness.spec.ts
import { test, expect } from "@playwright/test";
import { login } from "../utils/login"; 

// ---------- helpers ----------
const CREATE_REQ_RX = /^\s*(create|add)\s+requirement(s)?\s*$/i;

/** Open “Take Action → Create Requirement” regardless of UI framework/roles */
async function openCreateRequirement(page) {
  // Click the Take Action trigger
  const takeAction = page
    .getByRole("button", { name: /take action/i })
    .or(page.locator('button:has-text("Take Action")'))
    .or(page.locator('[data-testid="take-action"]'));

  await takeAction.scrollIntoViewIfNeeded();
  // If your UI needs hover-before-click, uncomment:
  // await takeAction.hover(); await page.waitForTimeout(120);
  await takeAction.click();

  // Wait for any overlay/menu container to appear (Angular/MUI/AntD/Bootstrap/custom)
  const overlay = page.locator([
    '[role="menu"]',
    '[role="listbox"]',
    '.mat-menu-panel',
    '.cdk-overlay-pane',
    '.dropdown-menu.show, .dropdown-menu',
    '.ant-dropdown, .ant-dropdown-menu, .ant-select-dropdown',
    '.MuiMenu-paper, .MuiPopover-paper',
    '.popover, .popover-content, .menu, .context-menu, .tray, .drawer'
  ].join(', '));

  await overlay.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => { /* inline menu case */ });

  // Prefer role-based item; fall back to generic button/a/li with matching text
  const itemByRole = page.getByRole("menuitem", { name: CREATE_REQ_RX }).first();
  const itemGeneric = page
    .locator('button, a, li, .dropdown-item, .mat-menu-item, .ant-dropdown-menu-item, .MuiMenuItem-root')
    .filter({ hasText: CREATE_REQ_RX })
    .first();

  const target = (await itemByRole.count()) ? itemByRole : itemGeneric;

  if (!(await target.isVisible().catch(() => false))) {
    // last-resort loose match by text containing “Requirement”
    const loose = page.locator('text=/requirement/i').first();
    await loose.waitFor({ state: "visible", timeout: 3000 });
    await loose.click();
    return;
  }

  await target.click();
}

/** Pick the first visible option from a dropdown trigger */
async function pickAnyOption(page, trigger) {
  await trigger.click();
  const option = page.locator(
    '[role="option"], [role="menuitem"], .dropdown-item, .option, li, .mat-option'
  ).first();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();
}

/** Minimal success toast watcher */
async function waitForSuccessToast(page, timeout = 7000) {
  const toast = page.locator(`
    .Toastify__toast-body,
    .Toastify__toast,
    .MuiSnackbar-root,
    .snackbar,
    .toast,
    [role="alert"],
    [role="status"],
    [aria-live="assertive"],
    [aria-live="polite"]
  `);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const n = await toast.count();
    for (let i = 0; i < n; i++) {
      const txt = ((await toast.nth(i).innerText()) || "").toLowerCase();
      if (/(created|success|saved)/i.test(txt)) return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

// ---------- test ----------
test.describe("Readiness | Create Requirement (navigate via sidebar)", () => {
  test("Login → Sidebar Readiness → Create Requirement", async ({ page }) => {
    // 1) Login (no storageState)
    const email = process.env.TEST_EMAIL!;
    const password = process.env.TEST_PASSWORD!;
    await login(page, email, password);

    // 2) Navigate via sidebar link (direct URL logs you out in your app)
    await page.getByRole("link", { name: /^Readiness$/i }).click();

    // 2a) Assert ONE unique heading to avoid strict-mode violations
    await expect(page.getByRole("heading", { name: /Readiness Overview/i }))
      .toBeVisible({ timeout: 10_000 });

    // 3) Open Create Requirement form (robust)
    await openCreateRequirement(page);

    // 4) Confirm the form opened with a unique heading
    await expect(page.getByRole("heading", { name: /create requirement/i }))
      .toBeVisible({ timeout: 10_000 });

    // 5) Fill the form with fake strings
    const requirementName = `Auto Req ${Date.now()}`;

    const reqInput = page.getByPlaceholder(/enter requirement/i)
      .or(page.getByLabel(/requirement/i))
      .or(page.getByTestId("requirement-input"));
    await reqInput.fill(requirementName);

    // Speciality (dropdown) – pick any option
    const specialityTrigger = page.getByRole("button", { name: /select speciality/i })
      .or(page.getByLabel(/speciality/i))
      .or(page.getByTestId("speciality-trigger"));
    await pickAnyOption(page, specialityTrigger);

    // Status (dropdown) – pick any option
    const statusTrigger = page.getByRole("button", { name: /^status$/i })
      .or(page.getByLabel(/^status$/i))
      .or(page.getByTestId("status-trigger"));
    await pickAnyOption(page, statusTrigger);

    // Notes (optional)
    const notes = page.getByPlaceholder(/write notes/i)
      .or(page.getByLabel(/notes/i))
      .or(page.getByTestId("notes-input"));
    if (await notes.isVisible().catch(() => false)) {
      await notes.fill("Automated test note — safe to ignore.");
    }

    // Icon (optional) – pick any option if present
    const iconTrigger = page.getByRole("button", { name: /select icon/i })
      .or(page.getByLabel(/icon/i))
      .or(page.getByTestId("icon-trigger"));
    if (await iconTrigger.isVisible().catch(() => false)) {
      await pickAnyOption(page, iconTrigger);
    }

    // 6) Submit and detect success (network → toast → row)
    const saveResp = page.waitForResponse(
      (r) => /requirement/i.test(r.url()) && /POST|PUT/i.test(r.request().method()),
      { timeout: 10_000 }
    ).catch(() => null);

    await page.getByRole("button", { name: /^submit$/i })
      .or(page.locator('button:has-text("Submit")'))
      .click();

    let ok = false;
    const resp = await saveResp;
    if (resp?.ok()) ok = true;
    if (!ok) ok = await waitForSuccessToast(page, 7000);
    if (!ok) {
      const row = page.getByText(requirementName).first();
      if (await row.isVisible().catch(() => false)) ok = true;
    }

    expect(ok, "No success signal after creating requirement (network/ toast/ list row)").toBeTruthy();
  });
});
