import { Reporter } from "@playwright/test";
import * as XLSX from "xlsx";

class ExcelReporter {
  constructor(options) {
    this.outputFile = options.outputFile || "playwright-results.xlsx";
    this.results = [];
  }

  onTestEnd(test, result) {
    // Build full test case title (suite + test)
    const fullTitle = test.titlePath().join(" > ");

    this.results.push({
      file: test.location.file,
      testCaseTitle: fullTitle,   // <-- Added full test case title
      name: test.title,           // Only test name
      status: result.status,
      duration: result.duration,
      project: test.parent.project()?.name || "default",
      retries: result.retry,
      error: result.error ? result.error.message : "",
      errorStack: result.error ? result.error.stack : "",
      screenshot: result.attachments.find(a => a.name === "screenshot")?.path || "",
      video: result.attachments.find(a => a.name === "video")?.path || "",
      startTime: result.startTime,
      endTime: new Date(result.startTime.getTime() + result.duration)
    });
  }

  async onEnd() {
    const worksheet = XLSX.utils.json_to_sheet(this.results, {
      header: [
        "file",
        "testCaseTitle", // full descriptive title
        "name",          // just the test name
        "status",
        "duration",
        "project",
        "retries",
        "error",
        "errorStack",
        "screenshot",
        "video",
        "startTime",
        "endTime"
      ]
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Test Results");

    XLSX.writeFile(workbook, this.outputFile);
    console.log(`✅ Excel report generated: ${this.outputFile}`);
  }
}

export default ExcelReporter;
