import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statfsSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, expect as baseExpect } from "@playwright/test";
import { rehearseAuthRestore } from "./auth-restore-scenario.mjs";
import { check, same, registerRehearsalCleanup } from "./isolated-database.mjs";
import { request } from "./auth-rehearsal.mjs";

const expect = baseExpect.configure({ timeout: 15000 });
const root = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");

async function freePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

await rehearseAuthRestore(
  async ({ target, database, accounts, unconfirmed, services }) => {
    target.setPhase("restored gateway readiness and API-key boundary");
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const health = await request(
          services.gatewayOrigin,
          "/auth/v1/health",
          { apiKey: services.anonKey },
        );
        if (health.status === 200) {
          ready = true;
          break;
        }
      } catch {
        /* Startup only; never log raw responses or configuration. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    check(ready, "Restored gateway did not become healthy");
    const missingKey = await request(services.gatewayOrigin, "/auth/v1/health");
    const wrongKey = await request(services.gatewayOrigin, "/auth/v1/health", {
      apiKey: "fictional-invalid-key",
    });
    check(
      missingKey.status === 401 && wrongKey.status === 401,
      "Gateway must require the configured public key",
    );
    const anonymous = await request(
      services.gatewayOrigin,
      "/rest/v1/profiles?select=user_id",
      { apiKey: services.anonKey, token: services.anonKey },
    );
    check(
      anonymous.status === 401 && anonymous.data.code === "42501",
      "Gateway public key must not grant user-data access",
    );

    target.setPhase("isolated production application build");
    const disk = statfsSync(root);
    check(
      disk.bavail * disk.bsize >= 2 * 1024 ** 3,
      "At least 2 GiB of temporary build headroom required",
    );
    const parent = join(root, ".cache");
    mkdirSync(parent, { recursive: true });
    const workspace = realpathSync(mkdtempSync(join(parent, "recovery-app-")));
    const modules = join(workspace, "node_modules");
    let server;
    let browser;
    const serverErrorKinds = new Set();
    let cleanupTask;
    function cleanup() {
      return (cleanupTask ??= releaseResources());
    }
    async function releaseResources() {
      if (browser) {
        await browser.close();
        browser = undefined;
      }
      if (server && server.exitCode === null && server.signalCode === null) {
        const stopped = new Promise((resolve) => server.once("exit", resolve));
        server.kill();
        await Promise.race([
          stopped,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("App shutdown timed out")),
              10000,
            ).unref(),
          ),
        ]);
      }
      check(
        realpathSync(workspace).startsWith(realpathSync(parent) + sep) &&
          workspace.split(sep).at(-1).startsWith("recovery-app-"),
        "Refusing cleanup outside the owned application workspace",
      );
      // Remove the dependency link itself before recursively removing our copy.
      try {
        check(
          lstatSync(modules).isSymbolicLink(),
          "Unexpected dependency directory",
        );
        unlinkSync(modules);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      rmSync(workspace, { recursive: true });
    }
    const unregister = registerRehearsalCleanup(
      cleanup,
      "isolated recovery browser application",
    );
    try {
      for (const path of [
        "src",
        "tests",
        "scripts",
        "package.json",
        "tsconfig.json",
        "vitest.config.ts",
        "vitest.integration.config.ts",
        "playwright.config.ts",
        "playwright.auth.config.ts",
        "playwright.home-study.config.ts",
        "postcss.config.mjs",
        "next.config.ts",
      ])
        cpSync(join(root, path), join(workspace, path), { recursive: true });
      if (existsSync(join(root, "public")))
        cpSync(join(root, "public"), join(workspace, "public"), {
          recursive: true,
        });
      else mkdirSync(join(workspace, "public"));
      symlinkSync(
        join(root, "node_modules"),
        modules,
        process.platform === "win32" ? "junction" : "dir",
      );
      // Same production config; only widen Turbopack's root to resolve our own
      // existing dependencies through the link. No .env files or builds copied.
      const config = join(workspace, "next.config.ts");
      writeFileSync(
        config,
        readFileSync(config, "utf8") +
          `\nconfig.turbopack = { ...config.turbopack, root: ${JSON.stringify(root)} };\n`,
      );
      const marker = randomUUID();
      writeFileSync(
        join(workspace, "public", "lifeos-recovery-marker.txt"),
        marker,
      );
      const env = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) =>
            /^(path|systemroot|windir|temp|tmp|home|userprofile|appdata|localappdata|CI)$/i.test(
              key,
            ),
          ),
        ),
        NEXT_TELEMETRY_DISABLED: "1",
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "",
        NEXT_PUBLIC_SUPABASE_URL: services.gatewayOrigin(),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: services.anonKey,
      };
      const built = spawnSync(process.execPath, [nextCli, "build", workspace], {
        cwd: workspace,
        env,
        windowsHide: true,
        encoding: "utf8",
        timeout: 300000,
        maxBuffer: 8 * 1024 * 1024,
      });
      check(
        !built.error && built.status === 0,
        "Isolated production build failed (output withheld)",
      );
      const port = await freePort();
      const origin = `http://127.0.0.1:${port}`;
      target.setPhase("isolated production application startup");
      server = spawn(
        process.execPath,
        [
          nextCli,
          "start",
          workspace,
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          cwd: workspace,
          env,
          windowsHide: true,
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      server.stderr.on("data", (chunk) => {
        // Keep only fixed diagnostic categories; never retain raw server logs.
        for (const kind of [
          "Invalid Supabase configuration",
          "Invalid Server Actions request",
          "Cannot find module",
          "ECONNREFUSED",
          "ENOTFOUND",
        ])
          if (chunk.toString().includes(kind)) serverErrorKinds.add(kind);
      });
      let spawnError = false;
      server.once("error", () => {
        spawnError = true;
      });
      ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        check(
          !spawnError && server.exitCode === null,
          "Isolated application exited before readiness",
        );
        try {
          const response = await fetch(`${origin}/lifeos-recovery-marker.txt`, {
            redirect: "error",
            signal: AbortSignal.timeout(2000),
          });
          const content = await response.text();
          if (response.status === 200 && content === marker) {
            ready = true;
            break;
          }
        } catch {
          /* Readiness only; raw server errors are withheld. */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      check(ready, "Isolated application did not become ready");
      services.gatewayOrigin(); // Recheck ownership immediately before the browser.
      browser = await chromium.launch({ headless: true });
      for (const [name, device] of [
        ["desktop", devices["Desktop Chrome"]],
        [
          "mobile",
          { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
        ],
      ]) {
        const context = await browser.newContext({
          ...device,
          baseURL: origin,
        });
        let unexpectedNetwork = false;
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if ([origin, env.NEXT_PUBLIC_SUPABASE_URL].includes(url.origin))
            return route.continue();
          unexpectedNetwork = true;
          return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.setDefaultNavigationTimeout(30000);
        const violations = [];
        let pageErrors = 0;
        let serverErrors = 0;
        let submittedForms = 0;
        let failedRequests = 0;
        page.on("request", (request) => {
          if (request.method() === "POST") submittedForms++;
        });
        page.on("requestfailed", () => failedRequests++);
        page.on("pageerror", () => pageErrors++);
        page.on("response", (response) => {
          if (response.status() >= 500) serverErrors++;
        });
        page.on("console", (message) => {
          if (message.text().startsWith("LifeOS recovery CSP: "))
            violations.push(message.text().slice(21));
        });
        await page.addInitScript(() =>
          document.addEventListener("securitypolicyviolation", (event) =>
            console.error(`LifeOS recovery CSP: ${event.effectiveDirective}`),
          ),
        );
        async function login(credentials) {
          target.setPhase(`${name} restored login page and form styles`);
          await page.goto("/auth/login");
          await expect(
            page.getByRole("button", { name: "Anmelden", exact: true }),
          ).toHaveCSS("min-height", "48px");
          target.setPhase(`${name} restored login form submission`);
          await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
          await page
            .getByLabel("Passwort", { exact: true })
            .fill(credentials.password);
          await expect(page.getByLabel("E-Mail-Adresse")).toHaveValue(
            credentials.email,
          );
          await expect(
            page.getByLabel("Passwort", { exact: true }),
          ).toHaveValue(credentials.password);
          await page
            .getByRole("button", { name: "Anmelden", exact: true })
            .click();
        }
        try {
          target.setPhase(
            `${name} restored login rejects wrong and unconfirmed credentials`,
          );
          for (const [index, credentials] of [
            { email: accounts[0].email, password: "Wrong-fictional-password!" },
            unconfirmed,
          ].entries()) {
            await login(credentials);
            target.setPhase(
              `${name} restored invalid-login rejection ${index + 1}`,
            );
            await expect(
              page.getByRole("main").getByRole("alert"),
            ).toContainText("Anmeldung fehlgeschlagen");
            await page.goto("/account");
            await expect(page).toHaveURL(`${origin}/auth/login`);
          }
          for (const [index, account] of accounts.entries()) {
            target.setPhase(
              `${name} restored account ${index + 1} profile and income`,
            );
            await login(account);
            await expect(page).toHaveURL(`${origin}/account`);
            await expect(page.getByLabel("Anzeigename")).toHaveValue(
              target.sql(
                database,
                `select display_name from public.profiles where user_id='${account.id}';`,
              ),
            );
            const response = await page.reload();
            const policy = response.headers()["content-security-policy"];
            check(
              policy?.includes("'strict-dynamic'") &&
                !/unsafe-inline|unsafe-eval/.test(policy),
              "Restored app lacks production CSP",
            );
            check(
              response.headers()["cache-control"]?.includes("no-store"),
              "Private restored page may be cached",
            );
            const value = `Restore ${name} ${index + 1}`;
            await page.getByLabel("Anzeigename").fill(value);
            await page
              .getByRole("button", { name: "Profil speichern", exact: true })
              .click();
            await expect(page.getByRole("status")).toHaveText(
              "Dein Profil wurde gespeichert.",
            );
            await page.reload();
            await expect(page.getByLabel("Anzeigename")).toHaveValue(value);
            same(
              target.sql(
                database,
                `select display_name from public.profiles where user_id='${account.id}';`,
              ),
              value,
              "Browser write did not reach the restored target",
            );
            await page.goto("/account/onboarding/income");
            await expect(
              page.getByLabel("Bezeichnung des Einkommens"),
            ).toHaveValue("Fiktives Einkommen");
            await expect(
              page.getByLabel("Monatliches Nettoeinkommen (€)"),
            ).toHaveValue("2800,01");
            check(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              "Restored app has horizontal overflow",
            );
            await page
              .getByRole("button", { name: "Abmelden", exact: true })
              .click();
            await expect(page).toHaveURL(`${origin}/auth/login`);
            await page.goto("/account");
            await expect(page).toHaveURL(`${origin}/auth/login`);
            check(
              !(await context.cookies()).some((cookie) =>
                /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name),
              ),
              "Logout retained an Auth cookie",
            );
          }
          same(violations, [], "Restored browser flow violated CSP");
          check(
            !unexpectedNetwork,
            "Browser attempted to reach an unrelated origin",
          );
          console.log(
            `Restored ${name} browser flow passed: rejected invalid login, two accounts, profile write/reload, original income, logout and private-route protection.`,
          );
        } catch (error) {
          // Never print Playwright's raw locator/response diagnostics: they can
          // contain credentials or user data. Only name a known assertion.
          const assertion = error.matcherResult?.name;
          const inputError = await page
            .getByText("Bitte prüfe deine Eingaben.", { exact: true })
            .count();
          const appError = await page
            .getByText("Das hat gerade nicht geklappt.", { exact: true })
            .count();
          const invalidFields = await page.locator("input:invalid").count();
          console.error(
            `Browser failure categories: input=${inputError}, app=${appError}, pageErrors=${pageErrors}, serverErrors=${serverErrors}, submitted=${submittedForms}, failedRequests=${failedRequests}, invalidFields=${invalidFields}, CSP=${violations.length}, unrelatedOrigin=${unexpectedNetwork}; server=${[...serverErrorKinds].join(",") || "none"}.`,
          );
          if (
            [
              "toHaveCSS",
              "toHaveURL",
              "toHaveValue",
              "toHaveText",
              "toContainText",
            ].includes(assertion)
          )
            check(false, `Restored browser assertion failed: ${assertion}`);
          throw error;
        } finally {
          await context.close();
        }
      }
    } finally {
      try {
        await cleanup();
      } finally {
        unregister();
      }
    }
    console.log(
      "Restored gateway and production browser probe passed; cloud configuration and full user journeys remain separate acceptance work.",
    );
  },
);
