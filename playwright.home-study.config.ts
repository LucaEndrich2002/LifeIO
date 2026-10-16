import { defineConfig } from "@playwright/test";
import authConfig from "./playwright.auth.config";

// Separate from acceptance tests: this prepares material, never human results.
export default defineConfig({
  ...authConfig,
  testDir: "./tests/home-study",
  outputDir: ".cache/home-study-run",
  reporter: "list",
  projects: [
    {
      name: "home-study",
      use: {
        viewport: { width: 1280, height: 720 },
        locale: "de-DE",
        timezoneId: "Europe/Berlin",
        colorScheme: "light",
        trace: "off",
        screenshot: "off",
        video: "off",
      },
    },
  ],
});
