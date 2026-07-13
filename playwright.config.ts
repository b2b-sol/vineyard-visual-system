import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./atlas/tests",
  testMatch: "**/*.e2e.spec.{ts,tsx}",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ],
  outputDir: "test-results",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4173/vineyard-visual-system/",
    colorScheme: "light",
    locale: "en-US",
    screenshot: "only-on-failure",
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "field-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    reuseExistingServer: !isCi,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120_000,
    url: "http://127.0.0.1:4173/vineyard-visual-system/",
  },
});
