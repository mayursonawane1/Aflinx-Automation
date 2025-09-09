import { test, expect } from "@playwright/test";
import { readExcel } from "../tests/utils/excelUtils";

const testDataPath = "tests/data/loginTestData.xlsx";
const testData = readExcel(testDataPath);


function toastLocator(page) {
  return page.locator(`
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
}


async function waitForToastContains(page, text, timeout = 5000) {
  const target = new RegExp(text, "i");
  const start = Date.now();

  while (Date.now() - start < timeout) {
    
    const count = await toastLocator(page).count();
    for (let i = 0; i < count; i++) {
      const content = (await toastLocator(page).nth(i).textContent()) || "";
      if (target.test(content)) return true;
    }
   
    await page.waitForTimeout(100);
  }
  return false;
}

test.describe("Login Tests", () => {
  for (const data of testData) {
    test(`Login • ${data.TestCaseID} • ${data.Email} • expect=${data.ExpectedResult}`, async ({ page }, testInfo) => {
      await test.step("Open login page", async () => {
        await page.goto("http://3.213.139.49:8081/login", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      });

      await test.step("Submit credentials", async () => {
        await page.fill("input[type='email']", data.Email);
        await page.fill("input[type='password']", data.Password);
        await page.click("button:has-text('Sign in')");
      });

     
      let actualResult: "Success" | "Failure" = "Failure";

     
      const sawSuccessToast = await waitForToastContains(page, "User Logged in Successfully", 5000);

      

      if (sawSuccessToast ) {
        actualResult = "Success";
      } else {
        actualResult = "Failure";
      }

      // Attach evidence to HTML report
      await testInfo.attach("inputs.json", {
        body: JSON.stringify(
          { TestCaseID: data.TestCaseID, Email: data.Email, ExpectedResult: data.ExpectedResult },
          null,
          2
        ),
        contentType: "application/json",
      });

      
      try {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        await testInfo.attach("page.png", { body: screenshotBuffer, contentType: "image/png" });
      } catch {
        
      }

      
      expect(
        actualResult,
        `Login outcome mismatch. Expected=${data.ExpectedResult}, Actual=${actualResult}`
      ).toBe(data.ExpectedResult);
    });
  }
});
