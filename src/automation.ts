import { chromium } from "playwright";
import ExcelJS from "exceljs";

(async () => {
  const browser = await chromium.launch({ headless: false, channel: "chrome" }); // open real Chrome
  const context = await browser.newContext();
  const page = await context.newPage();

  // Example step: open Google
  const startTime = new Date();
  let status = "Passed";

  try {
    await page.goto("https://google.com");
    await page.waitForTimeout(2000); // wait 2 sec
  } catch (error) {
    status = "Failed";
  }

  const endTime = new Date();
  const executionTime = (endTime.getTime() - startTime.getTime()) / 1000;

  // Write results to Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Test Results");

  sheet.columns = [
    { header: "Test Case", key: "testCase", width: 30 },
    { header: "Status", key: "status", width: 15 },
    { header: "Execution Time (s)", key: "time", width: 20 },
  ];

  sheet.addRow({
    testCase: "Open Google",
    status,
    time: executionTime,
  });

  await workbook.xlsx.writeFile("TestResults.xlsx");
  console.log("✅ Results saved to TestResults.xlsx");

  await browser.close();
})();
