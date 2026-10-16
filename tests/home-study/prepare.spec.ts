import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Temporal } from "@js-temporal/polyfill";
import { expect, test, type Page } from "@playwright/test";
import { homePeriod } from "../../src/domain/home";
import { createEvent } from "../supabase/calendar-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createLinkBudget, createLinkGoal } from "../supabase/link-fixtures";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { createTask } from "../supabase/task-fixtures";

async function captureHome(page: Page) {
  const user = await createPlanFixture();
  const period = homePeriod(new Date(), "Europe/Berlin");
  const day = Temporal.PlainDate.from(period.day);
  const yesterday = day.subtract({ days: 1 }).toString();
  const appointment = day.toZonedDateTime({
    timeZone: "Europe/Berlin",
    plainTime: "10:00",
  });
  try {
    await createTask(user, "Reise planen", period.day, "high");
    await createTask(user, "Unterlagen prüfen", yesterday);
    await createEvent(user, "Beratung", {
      p_starts_at: appointment.toInstant().toString(),
      p_ends_at: appointment.add({ hours: 1 }).toInstant().toString(),
    });
    await createLinkBudget(user);
    expect(
      (
        await user.client.rpc("mutate_money", {
          p_operation: "create",
          p_kind: "expense",
          p_id: randomUUID(),
          p_revision: 0,
          p_payload: {
            name: "Reiseausgabe",
            amount: 60000,
            spent_on: "2026-09-28",
            category: "leisure",
          },
        })
      ).error,
    ).toBeNull();
    const goal = await createLinkGoal(user, "Sprache lernen");
    expect(
      (
        await user.client.rpc("mutate_personal_goal", {
          p_operation: "update",
          p_id: goal,
          p_revision: 0,
          p_name: "Sprache lernen",
          p_deadline: yesterday,
        })
      ).error,
    ).toBeNull();
    await page.goto("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await page.goto("/account/home?month=2026-09");
    await expect(page.getByTestId("home-available")).toHaveText("800,00 €");
    const today = page.getByRole("region", { name: "Heute", exact: true });
    await expect(today).toContainText("Reise planen");
    await expect(today).toContainText("Beratung");
    await expect(today).toContainText("10:00");
    await expect(today).toContainText("11:00");
    await expect(
      page.getByRole("region", { name: "Deine Ziele" }),
    ).toContainText("Sprache lernen");
    await expect(
      page
        .getByRole("region", { name: "Deine Ziele" })
        .getByRole("listitem")
        .filter({ hasText: "Sprache lernen" }),
    ).toContainText("Zieldatum überschritten");
    await expect(
      page.getByRole("region", { name: "Ein Blick lohnt sich" }),
    ).toContainText("Monatsbudget überschritten");
    await expect(
      page.getByRole("progressbar", { name: "Fortschritt: Reserve" }),
    ).toHaveAttribute("value", "35");
    await page.evaluate(() => document.fonts.ready);
    // Do not publish a capture made across local midnight with a stale fixture.
    expect(homePeriod(new Date(), "Europe/Berlin").day).toBe(period.day);
    const screenshot = await page.screenshot({ fullPage: true });
    return { screenshot, day: period.day, goalDeadline: yesterday };
  } finally {
    await removeFixture(user.id);
  }
}

test("prepare a fictional Home capture and check the manual study viewer", async ({
  page,
}) => {
  const capture = await captureHome(page);
  const preparedAt = new Date().toISOString();
  const folder = path.resolve(
    ".cache/home-study",
    preparedAt.replaceAll(/[:.]/g, "-"),
  );
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", `safe.directory=${process.cwd().replaceAll("\\", "/")}`, ...args],
      { encoding: "utf8", windowsHide: true },
    ).trim();
  const template = await readFile("tests/home-study/viewer.html", "utf8");
  const html = template.replace(
    "__DASHBOARD_IMAGE__",
    `data:image/png;base64,${capture.screenshot.toString("base64")}`,
  );
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "home.png"), capture.screenshot);
  await writeFile(path.join(folder, "index.html"), html);
  await copyFile(
    "docs/HOME_COMPREHENSION_TEST.md",
    path.join(folder, "ANLEITUNG.md"),
  );
  await writeFile(
    path.join(folder, "protokoll.csv"),
    "\uFEFFperson;datum;letzte_antwort_sekunden;antwort_heute;antwort_monat;antwort_ziel;heute_korrekt;monat_korrekt;ziel_korrekt;innerhalb_10_sekunden;unterbrechung;missverstaendnisse;ergebnis\n" +
      ["P01", "P02", "P03", "P04", "P05"]
        .map((id) => `${id}${";".repeat(12)}`)
        .join("\n") +
      "\n",
  );

  // Exercise the actual generated, self-contained file. No human result is inferred.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.install();
  await page.goto(pathToFileURL(path.join(folder, "index.html")).href);
  const start = page.getByRole("button", { name: "Test starten" });
  const view = page.getByRole("region", {
    name: "Dashboard-Aufnahme",
    exact: false,
  });
  await expect(start).toBeEnabled();
  await expect(view).toBeHidden();
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(view).toBeVisible();
  await expect(view).toBeFocused();
  await page.clock.runFor(10000);
  await expect(view).toBeHidden();
  await expect(page.getByRole("status")).toContainText(
    "Zeitkriterium nicht erfüllt",
  );
  const reset = page.getByRole("button", {
    name: "Nächste Person vorbereiten",
  });
  await reset.click();
  await start.click();
  await page.clock.runFor(2000);
  await page.getByRole("button", { name: "Letzte Antwort gegeben" }).click();
  await expect(view).toBeHidden();
  await expect(page.getByRole("status")).toContainText(
    "noch kein bestandenes Ergebnis",
  );
  await reset.click();
  await start.click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("status")).toContainText("Unterbrochen");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
  });
  await reset.click();
  await start.click();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.getByRole("status")).toContainText("Unterbrochen");
  await reset.click();
  await expect(start).toBeDisabled();

  // Only emit a ready manifest after cleanup and all preparation checks succeeded.
  await writeFile(
    path.join(folder, "manifest.json"),
    JSON.stringify(
      {
        preparation: "ready",
        humanAcceptance: "not_conducted",
        scenario: "J05-desktop-v1",
        preparedAt,
        sourceCommit: git("rev-parse", "HEAD"),
        sourceHasUncommittedChanges: git("status", "--porcelain").length > 0,
        buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
        screenshotSha256: createHash("sha256")
          .update(capture.screenshot)
          .digest("hex"),
        viewport: { width: 1280, height: 720 },
        locale: "de-DE",
        timeZone: "Europe/Berlin",
        theme: "light",
        profileDay: capture.day,
        financialMonth: "2026-09",
        goalDeadline: capture.goalDeadline,
        fixtureAccountRemoved: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Home-Testmaterial: ${folder}`);
});
