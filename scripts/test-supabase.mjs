import { spawnSync } from "node:child_process";
import { isLocalDockerEndpoint, readDockerEndpoint } from "./local-docker.mjs";

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
const configuration = JSON.parse(status.stdout);
const url = new URL(configuration.API_URL);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
  throw new Error("Remote Supabase tests are forbidden.");
const key = configuration.PUBLISHABLE_KEY ?? configuration.ANON_KEY;
const serviceKey = configuration.SECRET_KEY ?? configuration.SERVICE_ROLE_KEY;
if (!key || !serviceKey)
  throw new Error("Local Supabase test credentials unavailable.");
const env = {
  ...process.env,
  // Database/browser tests never use a real provider, even on configured hosts.
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  NEXT_PUBLIC_SUPABASE_URL: url.origin,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  LIFEOS_TEST_SERVICE_KEY: serviceKey,
  LIFEOS_TEST_MAIL_URL: configuration.MAILPIT_URL ?? configuration.INBUCKET_URL,
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
