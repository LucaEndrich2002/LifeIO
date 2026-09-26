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
  await page.goto("/account/goals");
}
async function openOriginal(page: Page) {
  await page.getByRole("link", { name: "Reserve öffnen", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+$/);
  return page.url();
}
async function saveGoal(page: Page) {
  await page
    .getByRole("button", { name: "Sparziel speichern", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+$/);
}

test("empty goals can be filled and edited while Money preserves the earlier savings rate", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true });
  try {
    await login(page, user);
    await expect(
      page.getByText("Du hast noch kein Sparziel angegeben.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Sparziel anlegen", exact: true })
      .click();
    await page.getByLabel("Name deines Sparziels").fill("Reise");
    await page.getByLabel("Zielbetrag (€)").fill("0");
    await page.getByLabel("Startguthaben (€)").fill("0");
    await page.getByLabel("Geplante monatliche Sparrate (€)").fill("100");
    await page.getByLabel("Sparrate gültig ab").fill("2026-09");
    await page
      .getByRole("button", { name: "Sparziel speichern", exact: true })
      .click();
    await expect(page.getByLabel("Zielbetrag (€)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Zielbetrag (€)").fill("1000");
    await saveGoal(page);
    const url = page.url();
    await expect(page.getByTestId("goal-balance")).toHaveText("0,00 €");
    await page
      .getByRole("link", { name: "Sparziel bearbeiten", exact: true })
      .click();
    await page.getByLabel("Name deines Sparziels").fill("Große Reise");
    await page.getByLabel("Zielbetrag (€)").fill("2000");
    await page.getByLabel("Startguthaben (€)").fill("100");
    await page.getByLabel("Geplante monatliche Sparrate (€)").fill("200");
    await page
      .getByRole("button", { name: "Sparziel speichern", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "nach dem letzten geplanten Startmonat",
    );
    await page.getByLabel("Sparrate gültig ab").fill("2026-10");
    await page.getByLabel("Zieldatum (optional)").fill("2027-06-30");
    await saveGoal(page);
    await page.reload();
    await expect(page.getByTestId("goal-balance")).toHaveText("100,00 €");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Große Reise",
    );
    await page.getByText("Verlauf der Sparraten", { exact: true }).click();
    await expect(
      page.getByText("Ab September 2026: 100,00 € monatlich", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Ab Oktober 2026: 200,00 € monatlich", { exact: true }),
    ).toBeVisible();
    await page.goto("/account/money?month=2026-09");
    await expect(page.getByTestId("month-available")).toHaveText("1.800,00 €");
    await expect(
      page.getByRole("link", { name: "Große Reise", exact: true }),
    ).toHaveAttribute("href", new URL(url).pathname);
    await page.goto("/account/money?month=2026-10");
    await expect(
      page.getByText("200,00 € geplant", { exact: true }),
    ).toBeVisible();
    await page.goto("/account/goals/new");
    await page.getByLabel("Name deines Sparziels").fill("Reserve zusätzlich");
    await page.getByLabel("Zielbetrag (€)").fill("500");
    await page.getByLabel("Startguthaben (€)").fill("0");
    await page.getByLabel("Geplante monatliche Sparrate (€)").fill("50");
    await page.getByLabel("Sparrate gültig ab").fill("2026-09");
    await saveGoal(page);
    await page.goto("/account/money?month=2026-09");
    await expect(page.getByTestId("month-available")).toHaveText("1.750,00 €");
  } finally {
    await removeFixture(user.id);
  }
});

test("real deposits can exceed the target and are cancelled only after confirmation", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    const url = await openOriginal(page);
    await expect(page.getByTestId("goal-balance")).toHaveText("3.500,00 €");
    await expect(page.getByTestId("goal-progress")).toHaveText("35 % erreicht");
    await page
      .getByRole("link", { name: "Einzahlung erfassen", exact: true })
      .click();
    await page.getByLabel("Einzahlung (€)").fill("7000,01");
    await page.getByLabel("Einzahlungsdatum").fill("2100-12-31");
    await page
      .getByRole("button", { name: "Einzahlung speichern", exact: true })
      .click();
    await expect(page.getByLabel("Einzahlungsdatum")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Einzahlung (€)")).toHaveValue("7000,01");
    await page.getByLabel("Einzahlungsdatum").fill("2026-01-15");
    await page.getByLabel("Notiz (optional)").fill("Bonus");
    await page
      .getByRole("button", { name: "Einzahlung speichern", exact: true })
      .click();
    await expect(page).toHaveURL(url);
    await page.reload();
    await expect(page.getByTestId("goal-balance")).toHaveText("10.500,01 €");
    await expect(page.getByTestId("goal-progress")).toHaveText(
      "105 % erreicht",
    );
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
    await expect(
      page.getByText("Ziel erreicht", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("goal-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("goal-dark.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: /^Einzahlung vom .* stornieren$/ })
      .click();
    await page
      .getByRole("button", { name: "Stornierung bestätigen", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(page.getByTestId("goal-balance")).toHaveText("10.500,01 €");
    await page
      .getByRole("link", { name: /^Einzahlung vom .* stornieren$/ })
      .click();
    await page
      .getByLabel("Diese Einzahlung stornieren", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Stornierung bestätigen", exact: true })
      .click();
    await expect(page).toHaveURL(url);
    await expect(page.getByTestId("goal-balance")).toHaveText("3.500,00 €");
    await expect(
      page.getByText("Storniert · zählt nicht zum Sparstand", { exact: true }),
    ).toBeVisible();
    await page.goto("/account/money?month=2026-09");
    await expect(page.getByTestId("month-available")).toHaveText("1.400,00 €");
  } finally {
    await removeFixture(user.id);
  }
});

test("stale goal edits preserve inputs, and foreign goal pages and contributions are hidden", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  const foreign = await createPlanFixture();
  try {
    await login(page, user);
    const url = await openOriginal(page);
    await page
      .getByRole("link", { name: "Sparziel bearbeiten", exact: true })
      .click();
    await expect(page.getByLabel("Name deines Sparziels")).toHaveValue(
      "Reserve",
    );
    const other = await context.newPage();
    await other.goto(`${url}?deposit=1`);
    await other.getByLabel("Einzahlung (€)").fill("100");
    await other.getByLabel("Einzahlungsdatum").fill("2026-01-15");
    await other
      .getByRole("button", { name: "Einzahlung speichern", exact: true })
      .click();
    await expect(other).toHaveURL(url);
    await other.close();
    await page.getByLabel("Name deines Sparziels").fill("Mein neuer Name");
    await page
      .getByRole("button", { name: "Sparziel speichern", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(page.getByLabel("Name deines Sparziels")).toHaveValue(
      "Mein neuer Name",
    );
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(page.getByTestId("goal-balance")).toHaveText("3.600,00 €");
    const foreignId = (await foreign.client.from("goals").select("id").single())
      .data!.id;
    await page.goto(`/account/goals/${foreignId}?edit=1`);
    await expect(page.getByLabel("Name deines Sparziels")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await context.clearCookies();
    await page.goto(url);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
