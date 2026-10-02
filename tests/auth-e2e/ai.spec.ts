import { expect, test } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
test("AI shows actual month data, consent, unavailable provider and no overflow", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await page.goto("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await page
      .getByRole("navigation", { name: "Persönliche Bereiche" })
      .getByRole("link", { name: "AI", exact: true })
      .click();
    await page.getByLabel("Monat auswählen").fill("2026-09");
    await page.getByRole("button", { name: "Daten anzeigen" }).focus();
    await page.keyboard.press("Enter");
    const facts = page.getByRole("region", { name: "Verwendete Monatsdaten" });
    await expect(facts).toContainText("1.400,00 €");
    await expect(facts).toContainText("September 2026");
    await expect(page.getByRole("status")).toContainText(
      "noch nicht eingerichtet",
    );
    await expect(page.getByRole("checkbox")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("link", { name: "Monatsübersicht prüfen" }),
    ).toHaveAttribute("href", "/account/money?month=2026-09");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("ai-month-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("ai-month-dark.png"),
      fullPage: true,
    });
    await page.getByLabel("Monat auswählen").fill("2026-10");
    await page.getByRole("button", { name: "Daten anzeigen" }).click();
    await expect(facts).toContainText("Noch nicht bestimmbar");
    await expect(facts).toContainText("Einnahmen für diesen Monat");
    await page.goto("/account/ai?month=invalid");
    await expect(
      page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toHaveCount(0);
  } finally {
    await removeFixture(user.id);
  }
});
test("AI keeps anonymous and incomplete accounts out of month data", async ({
  page,
}) => {
  await page.goto("/account/ai");
  await expect(page).toHaveURL(/\/auth\/login/);
  const user = await createPlanFixture({ complete: false });
  try {
    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await page.goto("/account/ai?month=2026-09");
    await expect(page).toHaveURL(/\/account\/onboarding/);
    await expect(
      page.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toHaveCount(0);
  } finally {
    await removeFixture(user.id);
  }
});
