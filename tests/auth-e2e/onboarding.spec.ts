import { expect, test, type Page } from "@playwright/test";
import { createFixture, removeFixture } from "../supabase/fixtures";

async function start(
  page: Page,
  fixture: Awaited<ReturnType<typeof createFixture>>,
) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
  await page.getByLabel("Passwort", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
  await page.getByLabel("Anzeigename").fill("Alex Test");
  await page.getByRole("button", { name: "Profil speichern" }).click();
  await page
    .getByRole("link", { name: "Weiter zur finanziellen Einrichtung" })
    .click();
  await expect(page).toHaveURL("/account/onboarding/income");
}
async function next(page: Page, step: string) {
  await page.getByRole("button", { name: "Speichern und weiter" }).click();
  await expect(page).toHaveURL(`/account/onboarding/${step}`);
}

test("financial setup persists, allows corrections and finishes with real plan values", async ({
  page,
}, testInfo) => {
  const fixture = await createFixture();
  try {
    await start(page, fixture);
    await page.getByLabel("Dein Startmonat").fill("2026-09");
    await page.getByLabel("Bezeichnung des Einkommens").fill("Gehalt");
    await page.getByLabel("Monatliches Nettoeinkommen (€)").fill("2800,50");
    await next(page, "expenses");
    await page.getByLabel("Bezeichnung 1", { exact: true }).fill("Miete");
    await page.getByLabel("Monatsbetrag 1 (€)").fill("900");
    await page
      .getByRole("button", { name: "Weitere Fixkosten hinzufügen" })
      .click();
    await page.getByLabel("Bezeichnung 2", { exact: true }).fill("Internet");
    await page.getByLabel("Monatsbetrag 2 (€)").fill("39.99");
    await next(page, "goal");
    await page.reload();
    await page.getByRole("link", { name: "2. Fixkosten" }).click();
    await expect(page.getByLabel("Monatsbetrag 2 (€)")).toHaveValue("39,99");
    await next(page, "goal");
    await page.getByLabel("Name deines Sparziels").fill("Notgroschen");
    await page.getByLabel("Zielbetrag (€)").fill("10000");
    await page.getByLabel("Bereits gespart (€)").fill("3500");
    await page.getByLabel("Geplante monatliche Sparrate (€)").fill("500");
    await next(page, "review");
    await expect(page.getByText("1.360,51 €", { exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "35");
    await page.getByRole("link", { name: "1. Einkommen" }).click();
    await page.getByLabel("Monatliches Nettoeinkommen (€)").fill("1000");
    await next(page, "expenses");
    await page.getByRole("link", { name: "4. Übersicht" }).click();
    await expect(page.getByText("−439,99 €", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Einrichtung abschließen" }).click();
    await expect(page).toHaveURL("/account/money?month=2026-09");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Dein Geld im Überblick.",
    );
    await expect(page.getByText("−439,99 €", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Nur gespeicherte Angaben fließen ein/),
    ).toBeVisible();
    expect(
      (await fixture.client.from("incomes").select("*")).data,
    ).toHaveLength(1);
    expect(
      (await fixture.client.from("expenses").select("*")).data,
    ).toHaveLength(2);
    expect((await fixture.client.from("goals").select("*")).data).toHaveLength(
      1,
    );
    expect(
      (await fixture.client.from("onboarding").select("completed_at").single())
        .data?.completed_at,
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("personal-overview.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("personal-overview-dark.png"),
      fullPage: true,
    });
    await page.goto("/account/onboarding/income");
    await expect(page).toHaveURL("/account/money?month=2026-09");
  } finally {
    await removeFixture(fixture.id);
  }
});

test("explicit omissions resume and finish without invented financial records", async ({
  page,
}, testInfo) => {
  const fixture = await createFixture();
  try {
    await page.goto("/account/onboarding/review");
    await expect(page).toHaveURL("/auth/login");
    await start(page, fixture);
    await page.goto("/account/onboarding/review");
    await expect(page).toHaveURL("/account/onboarding/income");
    await page.getByLabel("Kein Einkommen angeben", { exact: true }).check();
    await next(page, "expenses");
    await page
      .getByRole("link", { name: "Zum Profil · später weitermachen" })
      .click();
    await page
      .getByRole("link", { name: "Weiter zur finanziellen Einrichtung" })
      .click();
    await expect(page).toHaveURL("/account/onboarding/expenses");
    await page.getByLabel("Keine Fixkosten angeben", { exact: true }).check();
    await next(page, "goal");
    await page
      .getByLabel("Noch kein Sparziel angeben", { exact: true })
      .check();
    await next(page, "review");
    await expect(
      page.getByText("Noch unvollständig", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Einrichtung abschließen" }).click();
    await expect(page).toHaveURL(/\/account\/money\?month=\d{4}-\d{2}$/);
    for (const table of ["incomes", "expenses", "goals"] as const)
      expect((await fixture.client.from(table).select("*")).data).toEqual([]);
    await expect(
      page.getByText("Du hast noch kein Sparziel angegeben.", { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("empty-personal-overview.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();
    await expect(page).toHaveURL("/auth/login");
    await page.goto("/account/overview");
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(fixture.id);
  }
});

test("invalid amounts and stale saves preserve editable input without partial writes", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await createFixture();
  try {
    await start(page, fixture);
    await page.getByLabel("Bezeichnung des Einkommens").fill("Gehalt");
    await page.getByLabel("Monatliches Nettoeinkommen (€)").fill("123,456");
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Es wurde nichts gespeichert",
    );
    await expect(
      page.getByLabel("Monatliches Nettoeinkommen (€)"),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Monatliches Nettoeinkommen (€)")).toHaveValue(
      "123,456",
    );
    expect((await fixture.client.from("incomes").select("*")).data).toEqual([]);
    const other = await context.newPage();
    await other.goto("/account/onboarding/income");
    await other.getByLabel("Bezeichnung des Einkommens").fill("Neuer Stand");
    await other.getByLabel("Monatliches Nettoeinkommen (€)").fill("2000");
    await next(other, "expenses");
    await other.close();
    await page.getByLabel("Monatliches Nettoeinkommen (€)").fill("1500");
    await page.getByRole("button", { name: "Speichern und weiter" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "In einem anderen Tab",
    );
    await expect(page.getByLabel("Monatliches Nettoeinkommen (€)")).toHaveValue(
      "1500",
    );
    expect(
      (await fixture.client.from("incomes").select("amount_minor").single())
        .data?.amount_minor,
    ).toBe(200000);
    await page.screenshot({
      path: testInfo.outputPath("save-conflict.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Aktuellen Stand neu laden" }).click();
    await expect(page.getByLabel("Monatliches Nettoeinkommen (€)")).toHaveValue(
      "2000,00",
    );
    await expect(page.getByLabel("Bezeichnung des Einkommens")).toHaveValue(
      "Neuer Stand",
    );
  } finally {
    await removeFixture(fixture.id);
  }
});
