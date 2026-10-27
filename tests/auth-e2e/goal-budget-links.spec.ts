import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { observePolicyViolations } from "../csp";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import {
  createLinkBudget,
  createLinkGoal,
  financialLinkGoal,
  mutateLink,
  type LinkAccount,
} from "../supabase/link-fixtures";
async function login(page: Page, user: LinkAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
async function selectMonth(page: Page, goal: string, month = "2026-09") {
  await page.goto(`/account/goals/${goal}`);
  await page
    .getByRole("link", { name: "Monatsbudget verknüpfen", exact: true })
    .click();
  await page.getByLabel("Budgetmonat").fill(month);
  await page
    .getByRole("button", { name: "Budget suchen", exact: true })
    .click();
  await page.waitForURL(new RegExp(`month=${month}$`), { waitUntil: "load" });
}
async function create(page: Page) {
  await page
    .getByRole("button", { name: "Dieses Budget verknüpfen", exact: true })
    .click();
  await expect(page).toHaveURL(/#budgets$/);
}

test("budgets link both goal kinds, navigate both ways and unlink only after confirmation", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  const violations = await observePolicyViolations(page);
  try {
    const goal = await financialLinkGoal(user);
    const personal = await createLinkGoal(user);
    const budget = await createLinkBudget(user);
    await login(page, user);
    await selectMonth(page, goal, "2026-10");
    await expect(page.getByRole("main")).toContainText(
      "hast du noch kein Monatsbudget angelegt",
    );
    await expect(
      page.getByRole("button", { name: "Dieses Budget verknüpfen" }),
    ).toHaveCount(0);
    await page.getByLabel("Budgetmonat").fill("2026-09");
    await page.getByRole("button", { name: "Budget suchen" }).click();
    await expect(
      page.getByRole("heading", { name: "Alltagsbudget", exact: true }),
    ).toBeVisible();
    const submit = page.getByRole("button", {
      name: "Dieses Budget verknüpfen",
      exact: true,
    });
    await submit.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#budgets$/);
    const section = page.getByRole("region", {
      name: "Verknüpfte Monatsbudgets",
    });
    await expect(section).toContainText("500,00 €");
    await expect(section).toContainText("reserviert kein Geld");
    await expect(page.getByTestId("goal-balance")).toHaveText("3.500,00 €");
    await page.reload();
    await expect(
      section.getByRole("heading", { name: "Alltagsbudget" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await section.screenshot({
      path: testInfo.outputPath("goal-budget-links-light.png"),
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await section.screenshot({
      path: testInfo.outputPath("goal-budget-links-dark.png"),
    });
    await section.getByRole("link", { name: /Alltagsbudget.*öffnen/ }).click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-09#budget$/);
    await expect(
      page.getByRole("main").getByTestId("budget-remaining"),
    ).toHaveText("500,00 € verbleibend");
    await page.getByRole("link", { name: "Verknüpfte Ziele ansehen" }).click();
    await expect(page).toHaveURL(`/account/money/budget/${budget}/goals`);
    await page
      .getByRole("link", { name: "Reserve öffnen", exact: true })
      .click();
    await expect(page).toHaveURL(`/account/goals/${goal}#budgets`);
    await selectMonth(page, goal);
    await expect(page.getByRole("status")).toContainText(
      "bereits mit dem Ziel verknüpft",
    );
    await expect(
      page.getByRole("button", { name: "Dieses Budget verknüpfen" }),
    ).toHaveCount(0);
    await selectMonth(page, personal);
    await create(page);
    await expect(page.getByTestId("goal-balance")).toHaveCount(0);
    await page.goto(`/account/money/budget/${budget}/goals`);
    await expect(
      page.getByRole("link", { name: "Reserve öffnen", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sprache lernen öffnen", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Sprache lernen öffnen", exact: true })
      .click();
    await section
      .getByRole("link", { name: /Verknüpfung mit Alltagsbudget/ })
      .click();
    await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(
      section.getByRole("heading", { name: "Alltagsbudget" }),
    ).toBeVisible();
    await section
      .getByRole("link", { name: /Verknüpfung mit Alltagsbudget/ })
      .click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
    await expect(section).toContainText("Du hast noch kein Monatsbudget");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Sprache lernen",
    );
    await page.goto(`/account/money/budget/${budget}/goals`);
    await expect(
      page.getByRole("link", { name: "Reserve öffnen", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sprache lernen öffnen", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Zurück zum Monatsbudget" }).click();
    await page
      .getByRole("link", { name: "Budget entfernen", exact: true })
      .click();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Budget löschen", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-09$/);
    await page.goto(`/account/goals/${goal}`);
    await expect(section).toContainText("Du hast noch kein Monatsbudget");
    await expect(page.getByTestId("goal-balance")).toHaveText("3.500,00 €");
    expect(violations).toEqual([]);
  } finally {
    await removeFixture(user.id);
  }
});

test("stale linking forms fail safely and foreign endpoints stay private", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  const other = await createPlanFixture();
  try {
    const goal = await financialLinkGoal(user);
    const budget = await createLinkBudget(user);
    const foreignGoal = await financialLinkGoal(other);
    const foreignBudget = await createLinkBudget(
      other,
      "2026-09",
      "Fremdes Budget",
    );
    const foreignLink = randomUUID();
    expect(
      (await mutateLink(other, foreignGoal, foreignBudget, foreignLink)).error,
    ).toBeNull();
    await login(page, user);
    await selectMonth(page, goal);
    await expect(
      page.getByRole("button", { name: "Dieses Budget verknüpfen" }),
    ).toBeVisible();
    expect(
      (
        await user.client.rpc("mutate_budget", {
          p_operation: "delete",
          p_id: budget,
          p_revision: 0,
          p_payload: {},
        })
      ).error,
    ).toBeNull();
    await page
      .getByRole("button", { name: "Dieses Budget verknüpfen" })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "möglicherweise nicht mehr verfügbar",
    );
    await page.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(
      page.getByRole("region", { name: "Verknüpfte Monatsbudgets" }),
    ).toContainText("Du hast noch kein Monatsbudget");
    for (const path of [
      `/account/goals/${foreignGoal}/budgets/new`,
      `/account/goals/${goal}/budgets/${foreignLink}`,
      `/account/money/budget/${foreignBudget}/goals`,
      `/account/goals/${goal}/budgets/new?month=2026-13`,
      `/account/goals/${goal}?budget_page=-1`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
      await expect(page.getByRole("main")).not.toContainText("Fremdes Budget");
      await expect(
        page.getByRole("button", { name: "Dieses Budget verknüpfen" }),
      ).toHaveCount(0);
    }
    await context.clearCookies();
    await page.goto(`/account/goals/${goal}/budgets/new`);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await removeFixture(user.id);
    await removeFixture(other.id);
  }
});

test("both directions paginate completely and unlinking the last later-page item keeps a way back", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    const goal = await financialLinkGoal(user);
    const budget = await createLinkBudget(user);
    for (let i = 0; i < 26; i++) {
      const bd = await createLinkBudget(
        user,
        `${2027 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
        `Budget ${i + 1}`,
      );
      expect((await mutateLink(user, goal, bd)).error).toBeNull();
      const personal = await createLinkGoal(user, `Ziel ${i + 1}`);
      expect((await mutateLink(user, personal, budget)).error).toBeNull();
    }
    await login(page, user);
    await page.goto(`/account/goals/${goal}`);
    const section = page.getByRole("region", {
      name: "Verknüpfte Monatsbudgets",
    });
    await expect(
      section.getByRole("heading", { name: "Budget 26", exact: true }),
    ).toBeVisible();
    await section.getByRole("link", { name: "Nächste Seite" }).click();
    await expect(section).toContainText("Seite 2 · 26 Verknüpfungen");
    await expect(
      section.getByRole("heading", { name: "Budget 1", exact: true }),
    ).toBeVisible();
    await section
      .getByRole("link", { name: /Verknüpfung mit Budget 1 / })
      .click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
    await expect(page).toHaveURL(/budget_page=1#budgets$/);
    await expect(section).toContainText(
      "Auf dieser Seite gibt es keine Verknüpfungen.",
    );
    await section.getByRole("link", { name: "Vorherige Seite" }).click();
    await expect(
      section.getByRole("heading", { name: "Budget 26", exact: true }),
    ).toBeVisible();
    await page.goto(`/account/money/budget/${budget}/goals`);
    await expect(
      page.getByRole("heading", { name: "Ziel 26", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Nächste Seite" }).click();
    await expect(
      page.getByRole("heading", { name: "Ziel 1", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("main")).toContainText(
      "Seite 2 · 26 Verknüpfungen",
    );
  } finally {
    await removeFixture(user.id);
  }
});
