import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/auth-e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-auth-report" }],
  ],
  outputDir: "test-results-auth",
  // Auth traces can record passwords, codes and cookies. Keep them out of artifacts.
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-auth", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-auth",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: "pnpm start --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
    env: { LIFEOS_TEST_SERVICE_KEY: "", OPENAI_API_KEY: "", OPENAI_MODEL: "" },
  },
});
