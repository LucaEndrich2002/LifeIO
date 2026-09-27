import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";

type Account = Awaited<ReturnType<typeof createPlanFixture>>;
async function login(page: Page, user: Account) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
  await page.goto("/account/goals");
  await page
    .getByRole("link", { name: "Persönliche Ziele", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Deine persönlichen Ziele",
  );
}
async function seed(user: Account, name: string) {
  const id = randomUUID();
  expect(
    (
      await user.client.rpc("mutate_personal_goal", {
        p_operation: "create",
        p_id: id,
        p_revision: 0,
        p_name: name,
      })
    ).error,
  ).toBeNull();
  return id;
}
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Persönliches Ziel speichern", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+$/);
}

test("personal goals need no money and keep edited deadlines and milestone progress", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture({ skipGoal: true });
  try {
    await login(page, user);
    await expect(
      page.getByText("Du hast noch kein persönliches Ziel angelegt."),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Persönliches Ziel anlegen", exact: true })
      .click();
    await expect(page.getByLabel("Zielbetrag (€)")).toHaveCount(0);
    await expect(
      page.getByLabel("Geplante monatliche Sparrate (€)"),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Persönliches Ziel speichern" })
      .click();
    await expect(page.getByLabel("Name des Ziels")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Name des Ziels").fill("Italienisch lernen");
    await page.getByLabel("Zieldatum (optional)").fill("2027-02-28");
    await save(page);
    const url = page.url();
    await expect(page.getByRole("main")).toContainText("Zieldatum: 28.02.2027");
    await expect(page.getByRole("main").getByRole("progressbar")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("goal-balance")).toHaveCount(0);
    await expect(page.getByTestId("goal-forecast")).toHaveCount(0);
    await page
      .getByRole("link", { name: "Meilenstein anlegen", exact: true })
      .click();
    await page
      .getByLabel("Name des Meilensteins")
      .fill("Ersten Kurs abschließen");
    await page
      .getByRole("button", { name: "Meilenstein speichern", exact: true })
      .click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 1 Meilensteinen erledigt",
    );
    const done = page.getByRole("button", {
      name: "Als erledigt markieren: Ersten Kurs abschließen",
      exact: true,
    });
    await done.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 1 Meilensteinen erledigt",
    );
    await page.reload();
    await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
    await page
      .getByRole("link", { name: "Persönliches Ziel bearbeiten", exact: true })
      .click();
    await page.getByLabel("Name des Ziels").fill("Italienisch sicher sprechen");
    await page.getByLabel("Zieldatum (optional)").fill("");
    await save(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Italienisch sicher sprechen",
    );
    await expect(page.getByRole("main")).toContainText(
      "Kein Zieldatum festgelegt",
    );
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 1 Meilensteinen erledigt",
    );
    await expect(page.getByRole("main")).not.toContainText("Sparstand");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("personal-goal-light.png") });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("personal-goal-dark.png") });
    await page
      .getByRole("button", {
        name: "Wieder öffnen: Ersten Kurs abschließen",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 1 Meilensteinen erledigt",
    );
    await page.getByRole("link", { name: "Alle persönlichen Ziele" }).click();
    await expect(
      page.getByRole("heading", { name: "Italienisch sicher sprechen" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Sparziele", exact: true }).click();
    await expect(
      page.getByText("Du hast noch kein Sparziel angegeben."),
    ).toBeVisible();
    await page.goto(`${url}?deposit=1`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await expect(
      page.getByRole("button", { name: "Einzahlung speichern" }),
    ).toHaveCount(0);
  } finally {
    await removeFixture(user.id);
  }
});

test("personal goals keep conflicting edits and deny foreign and anonymous access", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  const otherUser = await createPlanFixture();
  try {
    const id = await seed(user, "Mein Ziel");
    const foreignId = await seed(otherUser, "Privates fremdes Ziel");
    await login(page, user);
    await page
      .getByRole("link", { name: "Mein Ziel öffnen", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Persönliches Ziel bearbeiten", exact: true })
      .click();
    const other = await context.newPage();
    await other.goto(`/account/goals/${id}?edit=1`);
    await other.getByLabel("Name des Ziels").fill("Aktueller Name");
    await save(other);
    await other.close();
    await page.getByLabel("Name des Ziels").fill("Meine erhaltene Eingabe");
    await page
      .getByRole("button", { name: "Persönliches Ziel speichern" })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(page.getByLabel("Name des Ziels")).toHaveValue(
      "Meine erhaltene Eingabe",
    );
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Aktueller Name",
    );
    for (const path of [
      `/account/goals/${foreignId}`,
      `/account/goals/${foreignId}?edit=1`,
      `/account/goals/${foreignId}/milestones/new`,
      `/account/goals/new?kind=unknown`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
      await expect(page.getByRole("main")).not.toContainText(
        "Privates fremdes Ziel",
      );
      await expect(page.getByLabel("Name des Ziels")).toHaveCount(0);
    }
    await context.clearCookies();
    await page.goto(`/account/goals/${id}?edit=1`);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(otherUser.id);
  }
});

test("goal kind selection persists across pages and both lists stay separate", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    for (let i = 0; i < 26; i++) await seed(user, `Persönliches Ziel ${i + 1}`);
    await login(page, user);
    await expect(
      page.getByRole("link", { name: "Reserve öffnen", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: "Persönliches Ziel 26 öffnen",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Nächste Seite", exact: true })
      .click();
    await expect(page).toHaveURL(/page=1&kind=personal$/);
    await expect(
      page.getByRole("link", {
        name: "Persönliches Ziel 1 öffnen",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page
        .getByRole("navigation", { name: "Zielarten" })
        .getByRole("link", { name: "Persönliche Ziele", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("link", { name: "Vorherige Seite", exact: true })
      .click();
    await page.getByRole("link", { name: "Sparziele", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Reserve öffnen", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Persönliches Ziel 26 öffnen",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Nächste Seite", exact: true }),
    ).toHaveCount(0);
  } finally {
    await removeFixture(user.id);
  }
});
