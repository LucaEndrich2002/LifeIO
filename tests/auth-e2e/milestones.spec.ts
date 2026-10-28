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
  await page.getByRole("link", { name: "Reserve öffnen", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+$/);
  return page.url();
}
async function save(page: Page) {
  await page
    .getByRole("button", { name: "Meilenstein speichern", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+#milestones$/);
}
async function seed(user: Account, goal: string, title: string) {
  const id = randomUUID();
  const result = await user.client.rpc("mutate_goal_milestone", {
    p_operation: "create",
    p_goal_id: goal,
    p_id: id,
    p_revision: 0,
    p_title: title,
  });
  expect(result.error).toBeNull();
  return id;
}
async function original(user: Account) {
  const result = await user.client.from("goals").select("id").single();
  expect(result.error).toBeNull();
  return result.data!.id;
}

test("milestones can be edited, completed, reopened and removed without changing the financial goal", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    const section = page.getByRole("region", { name: "Deine Meilensteine" });
    await expect(section).toContainText(
      "Du hast noch keine Meilensteine angelegt.",
    );
    await expect(section.getByRole("progressbar")).toHaveCount(0);
    await page
      .getByRole("link", { name: "Meilenstein anlegen", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Meilenstein speichern", exact: true })
      .click();
    await expect(page.getByLabel("Name des Meilensteins")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Name des Meilensteins").fill("Ziel klären");
    await save(page);
    await page
      .getByRole("link", { name: "Meilenstein anlegen", exact: true })
      .click();
    await page.getByLabel("Name des Meilensteins").fill("Angebote vergleichen");
    await save(page);
    const complete = page.getByRole("button", {
      name: "Als erledigt markieren: Ziel klären",
      exact: true,
    });
    await complete.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 2 Meilensteinen erledigt",
    );
    await page.reload();
    await expect(section.getByRole("progressbar")).toHaveAttribute(
      "value",
      "50",
    );
    await page
      .getByRole("link", { name: "Ziel klären bearbeiten", exact: true })
      .click();
    await page.getByLabel("Name des Meilensteins").fill("Ziel festlegen");
    await save(page);
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 2 Meilensteinen erledigt",
    );
    await expect(page.getByRole("main").getByTestId("goal-balance")).toHaveText(
      "3.500,00 €",
    );
    await expect(page.getByTestId("goal-forecast")).toContainText(
      "Noch 13 geplante Beiträge.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await section.screenshot({
      path: testInfo.outputPath("milestones-light.png"),
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await section.screenshot({
      path: testInfo.outputPath("milestones-dark.png"),
    });
    await page
      .getByRole("button", {
        name: "Wieder öffnen: Ziel festlegen",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 2 Meilensteinen erledigt",
    );
    await page
      .getByRole("link", {
        name: "Angebote vergleichen entfernen",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 2 Meilensteinen erledigt",
    );
    for (const title of ["Angebote vergleichen", "Ziel festlegen"]) {
      await page
        .getByRole("link", { name: `${title} entfernen`, exact: true })
        .click();
      await page.getByLabel("Diesen Meilenstein entfernen").check();
      await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
      await expect(page).toHaveURL(/#milestones$/);
    }
    await expect(section).toContainText(
      "Du hast noch keine Meilensteine angelegt.",
    );
    await expect(section.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("main").getByTestId("goal-balance")).toHaveText(
      "3.500,00 €",
    );
  } finally {
    await removeFixture(user.id);
  }
});

test("stale milestone forms preserve names and foreign goals and entries stay private", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  const foreign = await createPlanFixture();
  try {
    const goal = await original(user);
    const foreignGoal = await original(foreign);
    const id = await seed(user, goal, "Mein Schritt");
    const foreignId = await seed(foreign, foreignGoal, "Fremder Schritt");
    const url = await login(page, user);
    await page
      .getByRole("link", { name: "Mein Schritt bearbeiten", exact: true })
      .click();
    const other = await context.newPage();
    await other.goto(url);
    await other
      .getByRole("button", {
        name: "Als erledigt markieren: Mein Schritt",
        exact: true,
      })
      .click();
    await expect(other.getByTestId("milestone-count")).toHaveText(
      "1 von 1 Meilensteinen erledigt",
    );
    await other.close();
    await page
      .getByLabel("Name des Meilensteins")
      .fill("Meine erhaltene Eingabe");
    await page
      .getByRole("button", { name: "Meilenstein speichern", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(page.getByLabel("Name des Meilensteins")).toHaveValue(
      "Meine erhaltene Eingabe",
    );
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 1 Meilensteinen erledigt",
    );
    for (const path of [
      `/account/goals/${foreignGoal}/milestones/new`,
      `/account/goals/${goal}/milestones/${foreignId}`,
      `/account/goals/${foreignGoal}/milestones/${id}?action=remove`,
    ]) {
      await page.goto(path);
      await expect(page.getByLabel("Name des Meilensteins")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
      await expect(page.getByRole("main")).not.toContainText("Fremder Schritt");
    }
    await context.clearCookies();
    await page.goto(`/account/goals/${goal}/milestones/${id}`);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});

test("milestone progress includes later pages and status changes keep the selected page", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    const goal = await original(user);
    for (let i = 1; i <= 26; i++) await seed(user, goal, `Schritt ${i}`);
    await login(page, user);
    const navigation = page.getByRole("navigation", {
      name: "Meilensteine Seiten",
    });
    await navigation.getByRole("link", { name: "Nächste Seite" }).click();
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 26 Meilensteinen erledigt",
    );
    await page
      .getByRole("button", {
        name: "Als erledigt markieren: Schritt 1",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/milestone_page=1#milestones$/);
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "1 von 26 Meilensteinen erledigt",
    );
    await page
      .getByRole("link", { name: "Schritt 1 entfernen", exact: true })
      .click();
    await page.getByLabel("Diesen Meilenstein entfernen").check();
    await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
    await expect(page).toHaveURL(/milestone_page=1#milestones$/);
    await expect(page.getByTestId("milestone-count")).toHaveText(
      "0 von 25 Meilensteinen erledigt",
    );
    await expect(
      page.getByText("Auf dieser Seite gibt es keine Meilensteine."),
    ).toBeVisible();
    await navigation.getByRole("link", { name: "Vorherige Seite" }).click();
    await expect(
      page.getByRole("heading", { name: "Schritt 26", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Meilenstein anlegen", exact: true })
      .click();
    await page.getByLabel("Name des Meilensteins").fill("Neuster Schritt");
    await save(page);
    await expect(
      page.getByRole("heading", { name: "Neuster Schritt", exact: true }),
    ).toBeVisible();
  } finally {
    await removeFixture(user.id);
  }
});
