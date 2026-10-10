import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createAiPersonal } from "../supabase/ai-goals-fixtures";
import { createTask } from "../supabase/task-fixtures";
import { homePeriod } from "../../src/domain/home";
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
test("Home selects one inline AI scope, preserves context and resets disclosure without a live provider", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture({ skipGoal: true }),
    foreign = await createPlanFixture({ skipGoal: true });
  try {
    for (let i = 0; i < 7; i++)
      await createAiPersonal(user, `Schritt ${i + 1}`, `2100-01-0${i + 1}`);
    await createAiPersonal(foreign, "Fremdes Geheimnis");
    await createTask(
      user,
      "Woche vorbereiten",
      homePeriod(new Date(), "Europe/Berlin").day,
    );
    await login(page, user);
    await page.goto("/account/home?month=2026-09&goal_page=1");
    const insight = page.getByRole("region", {
      name: "Dein Überblick mit Life AI",
      exact: true,
    });
    await expect(insight).toContainText("Noch kein Bereich ausgewählt");
    await expect(insight.getByRole("checkbox")).toHaveCount(0);
    await insight.getByRole("link", { name: /Meinen Monat einordnen/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      "/account/home?month=2026-09&goal_page=1&insight=month#home-ai",
    );
    await expect(
      insight.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toContainText("September 2026");
    await expect(
      insight.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toContainText("1.900,00 €");
    await expect(insight.getByRole("checkbox")).toBeDisabled();
    await expect(insight.getByRole("checkbox")).not.toBeChecked();
    await expect(
      insight.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toBeDisabled();
    await insight.getByRole("link", { name: /Meine Woche einordnen/ }).click();
    await expect(
      insight.getByRole("region", { name: "Verwendete Aufgaben und Termine" }),
    ).toContainText("Woche vorbereiten");
    await expect(
      insight.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toHaveCount(0);
    await insight.getByRole("link", { name: /Meine Ziele einordnen/ }).click();
    const facts = insight.getByRole("region", { name: "Verwendete Zieldaten" });
    await expect(facts).toContainText("Ziel A: Schritt 7");
    await expect(facts).toContainText("1 von 7 Zielen");
    await expect(facts).not.toContainText("Schritt 1");
    await expect(insight).not.toContainText("Fremdes Geheimnis");
    await expect(
      insight.getByRole("region", { name: "Verwendete Aufgaben und Termine" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await insight.screenshot({
      path: testInfo.outputPath("home-ai-light.png"),
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await insight.screenshot({ path: testInfo.outputPath("home-ai-dark.png") });
    await insight.getByRole("link", { name: "KI-Bereich schließen" }).click();
    await expect(page).toHaveURL(
      "/account/home?month=2026-09&goal_page=1#home-ai",
    );
    await expect(insight).toContainText("Noch kein Bereich ausgewählt");
    await expect(
      page.getByRole("region", { name: "Deine Ziele", exact: true }),
    ).toContainText("Schritt 7");
    expect(
      (await user.client.from("ai_request_limits").select("*")).data,
    ).toEqual([]);
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
test("Home AI handles empty and out-of-range goals and rejects forged scope selection", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true });
  try {
    await page.goto("/account/home?insight=month");
    await expect(page).toHaveURL(/\/auth\/login/);
    await login(page, user);
    await page.goto("/account/home?month=2026-09&insight=goals");
    const insight = page.getByRole("region", {
      name: "Dein Überblick mit Life AI",
      exact: true,
    });
    await expect(insight).toContainText(
      "Noch keine Ziele für eine Erklärung erfasst",
    );
    await expect(
      insight.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toHaveCount(0);
    await expect(
      insight.getByRole("link", { name: "Ziele für die KI-Übersicht anlegen" }),
    ).toHaveAttribute("href", "/account/goals");
    await page.goto("/account/home?month=2026-09&goal_page=1001&insight=goals");
    await expect(insight).toContainText("außerhalb der KI-Vorschau");
    await insight
      .getByRole("link", { name: "Erste Zielseite für die KI öffnen" })
      .click();
    await expect(page).toHaveURL(
      "/account/home?month=2026-09&goal_page=0&insight=goals#home-ai",
    );
    await expect(insight).toContainText("Noch keine Ziele");
    for (const query of ["insight=all", "insight=month&insight=goals"]) {
      await page.goto(`/account/home?month=2026-09&${query}`);
      await expect(
        page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
      ).toBeVisible();
      await expect(page.getByTestId("home-available")).toHaveCount(0);
      await expect(insight).toHaveCount(0);
    }
  } finally {
    await removeFixture(user.id);
  }
});
