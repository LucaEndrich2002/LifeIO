import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";

async function login(
  page: Page,
  user: Awaited<ReturnType<typeof createPlanFixture>>,
) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
  await page.goto("/account/money?month=2026-09");
}
async function save(page: Page, label: string, month: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page).toHaveURL(`/account/money?month=${month}`);
}

test("fixed costs preserve earlier amounts and include a confirmed final month", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    await page.getByRole("link", { name: "Fixkosten verwalten" }).click();
    await page.getByRole("link", { name: "Fixkosten hinzufügen" }).click();
    await page.getByLabel("Bezeichnung", { exact: true }).fill("Internet");
    await page.getByLabel("Monatlicher Betrag (€)").fill("50");
    await page.getByLabel("Letzter gültiger Monat (optional)").fill("2026-08");
    await page.getByRole("button", { name: "Fixkosten speichern" }).click();
    await expect(
      page.getByLabel("Letzter gültiger Monat (optional)"),
    ).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Letzter gültiger Monat (optional)").fill("2026-11");
    await save(page, "Fixkosten speichern", "2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.350,00 €");
    await page.getByRole("link", { name: "Miete ändern", exact: true }).click();
    await page.getByLabel("Monatlicher Betrag (€)").fill("950");
    await page.getByLabel("Änderung gültig ab").fill("2026-09");
    await page.getByRole("button", { name: "Fixkosten speichern" }).click();
    await expect(page.getByLabel("Änderung gültig ab")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Änderung gültig ab").fill("2026-10");
    await save(page, "Fixkosten speichern", "2026-10");
    await page.goto("/account/money?month=2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.350,00 €");
    await page.getByRole("link", { name: "Miete Verlauf öffnen" }).click();
    await expect(
      page.getByRole("heading", { name: "Früherer Fixkostenstand" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Spätere Fassung öffnen" }).click();
    await expect(page.getByLabel("Monatlicher Betrag (€)")).toHaveValue(
      "950,00",
    );
    await page.goto("/account/money/fixed?month=2026-09");
    await page
      .getByRole("link", { name: "Internet Endmonat festlegen" })
      .click();
    await page
      .getByLabel("Letzter gültiger Monat", { exact: true })
      .fill("2026-09");
    await page
      .getByRole("button", { name: "Fixkosten beenden", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByLabel("Fixkosten nach dem gewählten Monat beenden").check();
    await save(page, "Fixkosten beenden", "2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.350,00 €");
    await page.goto("/account/money?month=2026-10");
    await expect(
      page.getByRole("link", { name: "Internet ändern", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Fixkosten verwalten" }).click();
    await expect(
      page.getByRole("link", { name: "Internet Endmonat festlegen" }),
    ).toBeVisible();
    await expect(
      page.getByText("Ab September 2026 bis einschließlich September 2026"),
    ).toBeVisible();
  } finally {
    await removeFixture(user.id);
  }
});

test("a monthly budget tracks 90 percent, overspending and confirmed removal without deleting expenses", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    expect(
      (
        await user.client.rpc("mutate_money", {
          p_kind: "expense",
          p_operation: "create",
          p_id: randomUUID(),
          p_revision: 0,
          p_payload: {
            name: "Alltag",
            amount: 45000,
            spent_on: "2026-09-15",
            category: "groceries",
          },
        })
      ).error,
    ).toBeNull();
    await login(page, user);
    await page.getByRole("link", { name: "Monatsbudget anlegen" }).click();
    await page.getByLabel("Bezeichnung", { exact: true }).fill("Mein Alltag");
    await page.getByLabel("Monatslimit (€)").fill("0");
    await page.getByRole("button", { name: "Budget speichern" }).click();
    await expect(page.getByLabel("Monatslimit (€)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Monatslimit (€)").fill("500");
    await save(page, "Budget speichern", "2026-09");
    await expect(page.getByRole("main").getByTestId("budget-usage")).toHaveText(
      "90 % genutzt",
    );
    await expect(
      page.getByRole("main").getByTestId("budget-remaining"),
    ).toHaveText("50,00 € verbleibend");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("950,00 €");
    await page.screenshot({
      path: testInfo.outputPath("budget-light.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Budget bearbeiten" }).click();
    await expect(page.getByLabel("Budgetmonat")).toHaveAttribute(
      "readonly",
      "",
    );
    await page.getByLabel("Monatslimit (€)").fill("400");
    await save(page, "Budget speichern", "2026-09");
    await expect(
      page.getByRole("main").getByTestId("budget-remaining"),
    ).toHaveText("−50,00 € verbleibend");
    await expect(
      page.getByText("Budget überschritten", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("950,00 €");
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("budget-dark.png"),
      fullPage: true,
    });
    await page.goto("/account/money?month=2026-10");
    await expect(page.getByTestId("budget-remaining")).toHaveCount(0);
    await page.goto("/account/money?month=2026-09");
    await page.getByRole("link", { name: "Budget entfernen" }).click();
    await page
      .getByRole("button", { name: "Budget löschen", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(
      page.getByRole("main").getByTestId("budget-remaining"),
    ).toHaveText("−50,00 € verbleibend");
    await page.getByRole("link", { name: "Budget entfernen" }).click();
    await page
      .getByLabel(
        "Dieses Monatsbudget endgültig löschen. Meine Ausgaben bleiben erhalten.",
      )
      .check();
    await save(page, "Budget löschen", "2026-09");
    await expect(
      page.getByRole("link", { name: "Monatsbudget anlegen" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Alltag bearbeiten", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("950,00 €");
  } finally {
    await removeFixture(user.id);
  }
});

test("conflicting fixed-cost forms retain input and foreign plans remain private", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  const foreign = await createPlanFixture();
  try {
    await login(page, user);
    await page.getByRole("link", { name: "Miete ändern", exact: true }).click();
    await expect(page).toHaveURL(
      /\/account\/money\/fixed\/[0-9a-f-]+\?month=2026-09$/,
    );
    const url = page.url();
    const other = await context.newPage();
    await other.goto(url);
    await other.getByLabel("Monatlicher Betrag (€)").fill("1000");
    await other.getByLabel("Änderung gültig ab").fill("2026-10");
    await save(other, "Fixkosten speichern", "2026-10");
    await other.close();
    await page.getByLabel("Monatlicher Betrag (€)").fill("1100");
    await page.getByLabel("Änderung gültig ab").fill("2026-11");
    await page.getByRole("button", { name: "Fixkosten speichern" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(page.getByLabel("Monatlicher Betrag (€)")).toHaveValue("1100");
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(
      page.getByText("1.000,00 € monatlich", { exact: true }),
    ).toBeVisible();
    const foreignId = (
      await foreign.client.from("expenses").select("id").single()
    ).data!.id;
    const budgetId = randomUUID();
    expect(
      (
        await foreign.client.rpc("mutate_budget", {
          p_operation: "create",
          p_id: budgetId,
          p_revision: 0,
          p_payload: { name: "Privat", amount: 50000, month: "2026-09" },
        })
      ).error,
    ).toBeNull();
    for (const path of [`fixed/${foreignId}`, `budget/${budgetId}`]) {
      await page.goto(`/account/money/${path}?month=2026-09`);
      await expect(page.getByLabel("Bezeichnung", { exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
    }
    await context.clearCookies();
    await page.goto(url);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
