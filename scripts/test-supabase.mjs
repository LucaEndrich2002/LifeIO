import { spawnSync } from "node:child_process";
import { isLocalDockerEndpoint, readDockerEndpoint } from "./local-docker.mjs";
import { parseLocalTestConfiguration } from "./local-test-configuration.mjs";

const mode = process.argv[2];
if (!["integration", "e2e", "home-study"].includes(mode))
  throw new Error("Choose integration, e2e or home-study.");
if (!isLocalDockerEndpoint(readDockerEndpoint()))
  throw new Error("Tests require local Docker.");
const status = spawnSync(
  process.execPath,
  ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
  { encoding: "utf8", windowsHide: true, timeout: 15000 },
);
if (status.status !== 0)
  throw new Error("Start local Supabase before running the database tests.");
// CLI output can contain privileged keys. Never print it or write it to a file.
const { url, key, serviceKey, mailUrl } = parseLocalTestConfiguration(
  status.stdout,
);
const env = {
  ...process.env,
  // Database/browser tests never use a real provider, even on configured hosts.
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  LIFEOS_TEST_SERVICE_KEY: serviceKey,
  LIFEOS_TEST_MAIL_URL: mailUrl,
};
const args =
  mode === "integration"
    ? [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "vitest.integration.config.ts",
      ]
    : [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        mode === "home-study"
          ? "playwright.home-study.config.ts"
          : "playwright.auth.config.ts",
      ];
const result = spawnSync(process.execPath, args, {
  env,
  stdio: "inherit",
  windowsHide: true,
});
process.exit(result.status ?? 1);
