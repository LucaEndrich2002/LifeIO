import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createTask, mutateTask } from "../supabase/task-fixtures";
import { createEvent } from "../supabase/calendar-fixtures";
import { createLinkBudget, createLinkGoal } from "../supabase/link-fixtures";
import { homePeriod } from "../../src/domain/home";
type Account = Awaited<ReturnType<typeof createPlanFixture>>;
async function login(page: Page, user: Account) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
test("home shows real day, money and goal data, explains attention and links to matching details", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop-auth")
    await page.setViewportSize({ width: 1440, height: 1000 });
  const user = await createPlanFixture(),
    period = homePeriod(new Date(), "Europe/Berlin");
  try {
    const task = await createTask(user, "Reise planen", period.day, "high");
    const yesterday = new Date(Date.parse(`${period.day}T12:00:00Z`) - 86400000)
      .toISOString()
      .slice(0, 10);
    await createTask(user, "Unterlagen prüfen", yesterday);
    await createEvent(user, "Beratung", {
      p_starts_at: period.range.start,
      p_ends_at: new Date(
        Date.parse(period.range.start) + 3600000,
      ).toISOString(),
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
    await user.client.rpc("mutate_personal_goal", {
      p_operation: "update",
      p_id: goal,
      p_revision: 0,
      p_name: "Sprache lernen",
      p_deadline: yesterday,
    });
    await login(page, user);
    await page.getByRole("link", { name: "Mein Dashboard öffnen" }).click();
    await expect(page).toHaveURL("/account/home");
    await page.getByLabel("Monat auswählen").fill("2026-09");
    await page.getByRole("button", { name: "Monat anzeigen" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("main").getByTestId("home-available"),
    ).toHaveText("800,00 €");
    const today = page.getByRole("region", { name: "Heute", exact: true });
    await expect(today).toContainText("1 offene Aufgabe für heute");
    await expect(today).toContainText("1 Termin heute");
    await expect(
      page.getByRole("region", { name: "Ein Blick lohnt sich" }),
    ).toContainText("Monatsbudget überschritten");
    await expect(
      page.getByRole("region", { name: "Ein Blick lohnt sich" }),
    ).toContainText("1 überfällige Aufgabe");
    await expect(
      page.getByRole("region", { name: "Deine Ziele" }),
    ).toContainText("Noch keine Meilensteine");
    await expect(
      page.getByRole("progressbar", { name: "Fortschritt: Reserve" }),
    ).toHaveAttribute("value", "35");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("home-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("home-dark.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Monatsdetails in Money" }).click();
    await expect(page).toHaveURL("/account/money?month=2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("800,00 €");
    await page.goto("/account/home?month=2026-09");
    await today
      .getByRole("link", { name: "Reise planen", exact: true })
      .click();
    await expect(page.getByLabel("Titel der Aufgabe")).toHaveValue(
      "Reise planen",
    );
    expect(
      (await mutateTask(user, { p_id: task, p_operation: "complete" })).error,
    ).toBeNull();
    await page.goto("/account/home?month=2026-09");
    await expect(today).toContainText("0 offene Aufgaben für heute");
    await page.getByLabel("Monat auswählen").fill("2026-10");
    await page.getByRole("button", { name: "Monat anzeigen" }).click();
    await expect(
      page.getByRole("main").getByTestId("home-available"),
    ).toHaveText("Noch unvollständig");
    await expect(today).toContainText("Beratung");
    await expect(
      page.getByRole("region", { name: "Ein Blick lohnt sich" }),
    ).not.toContainText("Monatsbudget überschritten");
  } finally {
    await removeFixture(user.id);
  }
});
test("home shows complete totals and paginates all goals without hiding older urgent goals", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true }),
    period = homePeriod(new Date(), "Europe/Berlin");
  try {
    for (let i = 0; i < 26; i++)
      await createTask(user, `Aufgabe ${i}`, period.day);
    for (let i = 0; i < 7; i++) await createLinkGoal(user, `Ziel ${i}`);
    await login(page, user);
    await page.goto("/account/home?month=2026-09");
    const today = page.getByRole("region", { name: "Heute", exact: true });
    await expect(today).toContainText("26 offene Aufgaben für heute");
    await expect(today.getByRole("listitem")).toHaveCount(3);
    const goals = page.getByRole("region", { name: "Deine Ziele" });
    await expect(goals.getByRole("listitem")).toHaveCount(6);
    await page.getByRole("link", { name: "Nächste Zielseite" }).click();
    await expect(page).toHaveURL(/goal_page=1/);
    await expect(goals.getByRole("listitem")).toHaveCount(1);
    await page.reload();
    await expect(goals).toContainText("Seite 2 · 7 Ziele");
    await page.getByRole("link", { name: "Vorherige Zielseite" }).click();
    await expect(goals.getByRole("listitem")).toHaveCount(6);
    await page.goto("/account/home?goal_page=2");
    await expect(goals).toContainText("Auf dieser Seite gibt es keine Ziele");
    await expect(
      page.getByRole("link", { name: "Vorherige Zielseite" }),
    ).toBeVisible();
  } finally {
    await removeFixture(user.id);
  }
});
test("empty and private home states never invent values or expose another account", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true, skipFixed: true }),
    foreign = await createPlanFixture();
  try {
    await createLinkGoal(foreign, "Geheimes Ziel");
    await createTask(
      foreign,
      "Geheime Aufgabe",
      homePeriod(new Date(), "Europe/Berlin").day,
    );
    await page.goto("/account/home");
    await expect(page).toHaveURL("/auth/login");
    await login(page, user);
    await page.goto(`/account/home?month=2026-09&user_id=${foreign.id}`);
    await expect(
      page.getByRole("main").getByTestId("home-available"),
    ).toHaveText("Noch unvollständig");
    await expect(page.getByRole("main")).toContainText("0 Ziele");
    await expect(page.getByRole("main")).not.toContainText("Geheimes Ziel");
    await expect(page.getByRole("main")).not.toContainText("Geheime Aufgabe");
    await expect(
      page.getByRole("link", { name: "Erstes Ziel anlegen" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    for (const path of [
      "/account/home?month=2026-13",
      "/account/home?goal_page=-1",
    ]) {
      await page.goto(path);
      // Private routes can stream their loading boundary before notFound().
      await expect(
        page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
      ).toBeVisible();
      await expect(page.getByTestId("home-available")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText("Alex Plans");
    }
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
