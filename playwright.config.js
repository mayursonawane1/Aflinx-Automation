// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "reports/html" }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? "http://3.213.139.49:8081",
    headless: false,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    { name: "Chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Firefox",  use: { ...devices["Desktop Firefox"] } },
    { name: "WebKit",   use: { ...devices["Desktop Safari"] } },
  ],
});
