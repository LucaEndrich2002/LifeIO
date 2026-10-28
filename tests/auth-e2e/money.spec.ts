import { expect, test, type Page } from "@playwright/test";
import { createFixture, removeFixture } from "../supabase/fixtures";
import type { Json } from "../../src/types/database";

async function preparedAccount() {
  const user = await createFixture();
  try {
    expect(
      (
        await user.client.from("profiles").insert({
          user_id: user.id,
          display_name: "Alex Money",
          time_zone: "Europe/Berlin",
        })
      ).error,
    ).toBeNull();
    const steps: [string, Json][] = [
      [
        "income",
        { decision: "saved", name: "Gehalt", amount: 280000, month: "2026-09" },
      ],
      [
        "expenses",
        { decision: "saved", items: [{ name: "Miete", amount: 90000 }] },
      ],
      [
        "goal",
        {
          decision: "saved",
          name: "Reserve",
          target: 1000000,
          current: 350000,
          monthly: 50000,
        },
      ],
      ["tasks", { decision: "skipped" }],
      ["complete", {}],
    ];
    for (const [revision, [step, payload]] of steps.entries())
      expect(
        (
          await user.client.rpc("save_onboarding_step", {
            p_step: step,
            p_payload: payload,
            p_revision: revision,
          })
        ).error,
      ).toBeNull();
    return user;
  } catch (error) {
    await removeFixture(user.id);
    throw error;
  }
}
async function login(
  page: Page,
  user: Awaited<ReturnType<typeof createFixture>>,
) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
  await page
    .getByRole("link", { name: "Meine Finanzübersicht öffnen" })
    .click();
  await expect(page).toHaveURL("/account/money?month=2026-09");
}
async function save(page: Page, month = "2026-09") {
  await page.getByRole("button", { name: "Eintrag speichern" }).click();
  await expect(page).toHaveURL(`/account/money?month=${month}`);
}

test("monthly income and variable expenses can be created, corrected, moved and confirmed for deletion", async ({
  page,
}, testInfo) => {
  const user = await preparedAccount();
  try {
    await login(page, user);
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.400,00 €");
    await page.getByRole("link", { name: "Einnahme hinzufügen" }).click();
    await page.getByLabel("Bezeichnung", { exact: true }).fill("Nebenjob");
    await page.getByLabel("Betrag (€)").fill("200");
    await save(page);
    await page.getByRole("link", { name: "Nebenjob bearbeiten" }).click();
    await page.getByLabel("Betrag (€)").fill("250");
    await save(page);
    await page.getByRole("link", { name: "Ausgabe hinzufügen" }).click();
    await page.getByLabel("Bezeichnung", { exact: true }).fill("Wocheneinkauf");
    await page.getByLabel("Betrag (€)").fill("10,99");
    await page.getByLabel("Datum", { exact: true }).fill("2026-09-30");
    await page.getByLabel("Kategorie").selectOption("groceries");
    await save(page);
    await page.reload();
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.639,01 €");
    await expect(
      page.getByText("30.9.2026 · Lebensmittel", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("money-month.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("money-month-dark.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Wocheneinkauf bearbeiten" }).click();
    await page.getByLabel("Datum", { exact: true }).fill("2026-10-01");
    await save(page, "2026-10");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("Noch unvollständig");
    await page.getByLabel("Monat auswählen").fill("2026-09");
    await page.getByRole("button", { name: "Monat anzeigen" }).click();
    await expect(page).toHaveURL("/account/money?month=2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.650,00 €");
    await expect(
      page.getByRole("link", { name: "Wocheneinkauf bearbeiten" }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Nebenjob löschen" }).click();
    await page.getByRole("button", { name: "Jetzt löschen" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(
      page.getByRole("link", { name: "Nebenjob bearbeiten" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Nebenjob löschen" }).click();
    await page.getByLabel("Diesen Eintrag endgültig löschen").check();
    await page.getByRole("button", { name: "Jetzt löschen" }).click();
    await expect(page).toHaveURL("/account/money?month=2026-09");
    await expect(
      page.getByRole("main").getByTestId("month-available"),
    ).toHaveText("1.400,00 €");
    await page.goto("/account/money?month=2026-10");
    await page.getByRole("link", { name: "Wocheneinkauf löschen" }).click();
    await page.getByLabel("Diesen Eintrag endgültig löschen").check();
    await page.getByRole("button", { name: "Jetzt löschen" }).click();
    await expect(page).toHaveURL("/account/money?month=2026-10");
    expect(
      (await user.client.from("expenses").select("id").eq("recurrence", "once"))
        .data,
    ).toEqual([]);
  } finally {
    await removeFixture(user.id);
  }
});

test("validation and concurrent edit conflicts keep input, while foreign IDs remain private", async ({
  page,
  context,
}) => {
  const user = await preparedAccount();
  const foreign = await preparedAccount();
  try {
    await login(page, user);
    await page.getByRole("link", { name: "Gehalt bearbeiten" }).click();
    await expect(page).toHaveURL(
      /\/account\/money\/income\/[0-9a-f-]+\?month=2026-09$/,
    );
    const entryUrl = page.url();
    await page.getByLabel("Betrag (€)").fill("1,001");
    await page.getByRole("button", { name: "Eintrag speichern" }).click();
    await expect(page.getByLabel("Betrag (€)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Betrag (€)")).toHaveValue("1,001");
    const other = await context.newPage();
    await other.goto(entryUrl);
    await other.getByLabel("Betrag (€)").fill("3000");
    await save(other);
    await other.close();
    await page.getByLabel("Betrag (€)").fill("2900");
    await page.getByRole("button", { name: "Eintrag speichern" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(page.getByLabel("Betrag (€)")).toHaveValue("2900");
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(page.getByLabel("Betrag (€)")).toHaveValue("3000,00");
    const foreignId = (
      await foreign.client.from("incomes").select("id").single()
    ).data!.id;
    await page.goto(`/account/money/income/${foreignId}?month=2026-09`);
    await expect(page.getByLabel("Betrag (€)")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await page.goto("/account/money?month=2026-13");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "ungültig",
    );
    await context.clearCookies();
    await page.goto(entryUrl);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
