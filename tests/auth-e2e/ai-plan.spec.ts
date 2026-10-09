import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { createTask } from "../supabase/task-fixtures";
import { createEvent } from "../supabase/calendar-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { aiPlanPeriod } from "../../src/domain/ai-plan";

async function login(
  page: Page,
  user: Awaited<ReturnType<typeof createPlanFixture>>,
) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
test("weekly explanation shows own actual data, consent and sources without a provider", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture(),
    foreign = await createPlanFixture();
  try {
    const now = new Date();
    now.setUTCSeconds(0, 0);
    const period = aiPlanPeriod(now, "Europe/Berlin");
    await createTask(user, "Unterlagen vorbereiten", period.as_of, "high");
    await createTask(user, "Undatierte Aufgabe");
    await createTask(foreign, "Fremde geheime Aufgabe", period.as_of);
    await createEvent(user, "Laufende Reise", {
      p_starts_at: new Date(now.getTime() - 60000).toISOString(),
      p_ends_at: new Date(now.getTime() + 3600000).toISOString(),
    });
    await login(page, user);
    await page.goto("/account/ai");
    const link = page.getByRole("link", {
      name: "Aufgaben und Termine mit Life AI",
    });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Deine Woche mit Life AI" }),
    ).toBeVisible();
    const facts = page.getByRole("region", {
      name: "Verwendete Aufgaben und Termine",
    });
    await expect(facts).toContainText("Unterlagen vorbereiten");
    await expect(facts).toContainText("Laufende Reise");
    await expect(facts).toContainText("Läuft bereits");
    await expect(facts).not.toContainText("Fremde geheime Aufgabe");
    await expect(facts).not.toContainText("Undatierte Aufgabe");
    await expect(page.getByRole("checkbox")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("nicht eingerichtet");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("ai-plan-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("ai-plan-dark.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Kalender dieser Woche prüfen", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/plan\/calendar\?view=week/);
    await page.goto("/account/ai/plan");
    await page
      .getByRole("link", {
        name: "Alle Aufgaben dieser Woche prüfen",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/account\/plan\?view=week/);
    await page
      .getByRole("link", { name: "Diese Woche mit Life AI einordnen" })
      .click();
    await expect(page).toHaveURL("/account/ai/plan");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
test("weekly explanation protects sign-in and setup and explains an empty week", async ({
  page,
}) => {
  const user = await createPlanFixture(),
    unfinished = await createPlanFixture({ complete: false });
  try {
    await page.goto("/account/ai/plan");
    await expect(page).toHaveURL(/\/auth\/login/);
    await login(page, unfinished);
    await page.goto("/account/ai/plan");
    await expect(page).toHaveURL(/\/account\/onboarding/);
    await page.context().clearCookies();
    await login(page, user);
    await page.goto("/account/ai/plan");
    await expect(
      page.getByText(
        "Keine offenen Aufgaben mit Fälligkeit in dieser Woche erfasst.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Keine laufenden oder bevorstehenden Termine bis Sonntag erfasst.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Verwendete Aufgaben und Termine" }),
    ).toContainText("Leere Listen bedeuten deshalb nicht");
  } finally {
    await removeFixture(user.id);
    await removeFixture(unfinished.id);
  }
});
