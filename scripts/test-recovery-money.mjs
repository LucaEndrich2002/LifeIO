import { randomUUID } from "node:crypto";
import { expect as baseExpect } from "@playwright/test";
import { rehearseRecoveryBrowser } from "./recovery-browser-scenario.mjs";
import { check, same } from "./isolated-database.mjs";

const expect = baseExpect.configure({ timeout: 15000 });
const fixtures = new Map();
const monthPath = "/account/money?month=2026-10";
const balances = [
  ["1.776,56 €", "1.765,57 €"],
  ["1.665,45 €", "1.654,46 €"],
];
const budgetCases = [
  {
    limit: 15000,
    display: "150,00 €",
    spent: "123,45 €",
    remaining: "26,55 €",
    usage: 82,
    createdSpent: "134,44 €",
    createdRemaining: "15,56 €",
    createdUsage: 90,
  },
  {
    limit: 25000,
    display: "250,00 €",
    spent: "234,56 €",
    remaining: "15,44 €",
    usage: 94,
    createdSpent: "245,55 €",
    createdRemaining: "4,45 €",
    createdUsage: 98,
  },
];

function budgets(context, database, userId) {
  return JSON.parse(
    context.sql(
      database,
      `select coalesce(jsonb_agg(to_jsonb(b) order by id),'[]'::jsonb) from public.budgets b where user_id='${userId}';`,
    ),
  );
}

function expenses(context, database, userId) {
  return JSON.parse(
    context.sql(
      database,
      `select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb) from public.expenses e where user_id='${userId}';`,
    ),
  );
}

await rehearseRecoveryBrowser({
  async prepareSource(source, accounts) {
    source.setPhase(
      "completed fictional onboarding and distinct Money fixtures",
    );
    for (const [index, account] of accounts.entries()) {
      const fixture = {
        id: randomUUID(),
        name: `Sicherung Konto ${index + 1}`,
        amount: [12345, 23456][index],
        budgetIds: [randomUUID(), randomUUID()],
        budgetNames: ["Oktober", "November"].map(
          (month) => `${month} Budget Konto ${index + 1}`,
        ),
        newNames: ["desktop", "mobile"].map(
          (view) => `Neu ${view} Konto ${index + 1}`,
        ),
      };
      source.sql(
        source.source,
        `begin; set local role authenticated;
        set local request.jwt.claim.sub='${account.id}';
        select public.save_onboarding_step('expenses','{"decision":"saved","items":[{"name":"Fiktive Miete","amount":90000}]}',1);
        select public.save_onboarding_step('goal','{"decision":"skipped"}',2);
        select public.save_onboarding_step('tasks','{"decision":"skipped"}',3);
        select public.save_onboarding_step('complete','{}',4);
        select public.mutate_money('expense','create','${fixture.id}',0,'${JSON.stringify({ name: fixture.name, amount: fixture.amount, spent_on: "2026-10-14", category: "groceries" })}');
        commit;`,
      );
      for (const [monthIndex, month] of ["2026-10", "2026-11"].entries()) {
        source.sql(
          source.source,
          `begin; set local role authenticated;
          set local request.jwt.claim.sub='${account.id}';
          select public.mutate_budget('create','${fixture.budgetIds[monthIndex]}',0,'${JSON.stringify({ name: fixture.budgetNames[monthIndex], amount: monthIndex === 0 ? budgetCases[index].limit : 2000, month })}');
          commit;`,
        );
      }
      fixture.sourceRows = expenses(source, source.source, account.id);
      fixture.sourceBudgets = budgets(source, source.source, account.id);
      fixtures.set(account.id, fixture);
    }
  },
  async verifyAccount({
    page,
    view,
    index,
    account,
    accounts,
    target,
    database,
    source,
  }) {
    const fixture = fixtures.get(account.id);
    const other = accounts[1 - index];
    const foreign = fixtures.get(other.id);
    const visit = view === "desktop" ? 0 : 1;
    const foreignBefore = expenses(target, database, other.id);
    const ownBefore = expenses(target, database, account.id);
    const ownBudgetsBefore = budgets(target, database, account.id);
    const foreignBudgetsBefore = budgets(target, database, other.id);
    const budgetCase = budgetCases[index];
    const main = page.getByRole("main");
    const ownEntry = (name) =>
      main.getByRole("link", { name: `${name} bearbeiten`, exact: true });
    const currentName = fixture.newNames[visit];
    function assertIsolated() {
      same(
        budgets(target, database, other.id),
        foreignBudgetsBefore,
        "Own operation changed another account's budgets",
      );
      same(
        expenses(target, database, other.id),
        foreignBefore,
        "Own operation changed another account",
      );
      for (const entry of accounts) {
        same(
          budgets(source, source.source, entry.id),
          fixtures.get(entry.id).sourceBudgets,
          "Browser operation changed budgets in the backup source",
        );
        same(
          expenses(source, source.source, entry.id),
          fixtures.get(entry.id).sourceRows,
          "Browser operation changed the backup source",
        );
      }
    }
    async function assertBudget(
      name,
      spent,
      limit,
      remaining,
      usage,
      over = false,
    ) {
      const card = main.locator("#budget");
      await expect(card.getByText(name, { exact: true })).toBeVisible();
      await expect(
        card.getByText(`${spent} von ${limit} ausgegeben`, { exact: true }),
      ).toBeVisible();
      await expect(card.getByTestId("budget-remaining")).toHaveText(
        `${remaining} verbleibend`,
      );
      await expect(card.getByTestId("budget-usage")).toHaveText(
        `${usage} % genutzt`,
      );
      await expect(card.getByRole("progressbar")).toHaveAttribute(
        "value",
        String(Math.min(usage, 100)),
      );
      await expect(
        card.getByText("Budget überschritten", { exact: true }),
      ).toHaveCount(over ? 1 : 0);
      for (const foreignName of foreign.budgetNames) {
        await expect(page.getByText(foreignName, { exact: true })).toHaveCount(
          0,
        );
      }
    }
    async function selectMonth(month) {
      await page.getByLabel("Monat auswählen", { exact: true }).fill(month);
      await main
        .getByRole("button", { name: "Monat anzeigen", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/account/money\\?month=${month}$`),
      );
      await page.reload();
    }
    async function assertNovember(amount) {
      // Income is explicitly monthly; October income must not be invented here.
      await expect(main.getByTestId("month-available")).toHaveText(
        "Noch unvollständig",
      );
      await expect(
        main
          .getByText("Erfasste variable Ausgaben", { exact: true })
          .locator("..")
          .locator("dd"),
      ).toHaveText(amount);
      await assertBudget(
        fixture.budgetNames[1],
        amount === "Keine erfasst" ? "0,00 €" : "25,01 €",
        "20,00 €",
        amount === "Keine erfasst" ? "20,00 €" : "−5,01 €",
        amount === "Keine erfasst" ? 0 : 125,
        amount !== "Keine erfasst",
      );
      for (const name of [fixture.name, foreign.name, ...foreign.newNames]) {
        await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      }
    }
    async function privateOverview() {
      await expect(ownEntry(fixture.name)).toHaveCount(1);
      await expect(ownEntry(fixture.name)).toBeVisible();
      // Privacy assertions deliberately include the entire document.
      for (const name of [foreign.name, ...foreign.newNames]) {
        await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      }
    }
    async function initialBudget() {
      await assertBudget(
        fixture.budgetNames[0],
        budgetCase.spent,
        budgetCase.display,
        budgetCase.remaining,
        budgetCase.usage,
      );
    }

    target.setPhase(
      `${view} restored Money account ${index + 1} saved month read`,
    );
    await page.goto(monthPath);
    await privateOverview();
    await initialBudget();
    same(
      ownBudgetsBefore,
      fixture.targetBudgets ?? fixture.sourceBudgets,
      "Restored budgets differ from the saved or previously verified state",
    );
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][0],
    );

    target.setPhase(
      `${view} restored Money account ${index + 1} expense creation`,
    );
    await main
      .getByRole("link", { name: "Ausgabe hinzufügen", exact: true })
      .click();
    await page
      .getByLabel("Bezeichnung", { exact: true })
      .fill(fixture.newNames[visit]);
    await page.getByLabel("Betrag (€)", { exact: true }).fill("10,99");
    await page.getByLabel("Datum", { exact: true }).fill("2026-10-15");
    await page
      .getByLabel("Kategorie", { exact: true })
      .selectOption("groceries");
    await page
      .getByRole("button", { name: "Eintrag speichern", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-10$/);
    await page.reload();
    await privateOverview();
    await expect(ownEntry(currentName)).toHaveCount(1);
    await expect(ownEntry(currentName)).toBeVisible();
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][1],
    );
    await assertBudget(
      fixture.budgetNames[0],
      budgetCase.createdSpent,
      budgetCase.display,
      budgetCase.createdRemaining,
      budgetCase.createdUsage,
    );

    target.setPhase(
      `${view} restored Money account ${index + 1} exact target persistence`,
    );
    const ownAfter = expenses(target, database, account.id);
    same(
      ownAfter.length,
      ownBefore.length + 1,
      "Expense must be created exactly once",
    );
    same(
      ownAfter.filter((row) =>
        ownBefore.some((before) => before.id === row.id),
      ),
      ownBefore,
      "Creating an expense changed an existing row",
    );
    const created = ownAfter.filter(
      (row) => !ownBefore.some((before) => before.id === row.id),
    );
    same(
      created.map((row) => ({
        name: row.name,
        amount: row.amount_minor,
        currency: row.currency,
        date: row.spent_on,
        category: row.category,
        userId: row.user_id,
        recurrence: row.recurrence,
      })),
      [
        {
          name: fixture.newNames[visit],
          amount: 1099,
          currency: "EUR",
          date: "2026-10-15",
          category: "groceries",
          userId: account.id,
          recurrence: "once",
        },
      ],
      "Created expense differs from the authorized integer-cent input",
    );
    assertIsolated();

    target.setPhase(
      `${view} restored Money account ${index + 1} expense edit and month move`,
    );
    await selectMonth("2026-11");
    await assertNovember("Keine erfasst");
    await selectMonth("2026-10");
    await ownEntry(currentName).click();
    await page.getByLabel("Betrag (€)", { exact: true }).fill("25,01");
    await page.getByLabel("Datum", { exact: true }).fill("2026-11-01");
    await page.getByLabel("Kategorie", { exact: true }).selectOption("other");
    await page
      .getByRole("button", { name: "Eintrag speichern", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-11$/);
    await page.reload();
    await assertNovember("25,01 €");
    await expect(ownEntry(currentName)).toHaveCount(1);
    await expect(ownEntry(currentName)).toBeVisible();
    const moved = expenses(target, database, account.id);
    same(
      moved.filter((row) => row.id !== created[0].id),
      ownBefore,
      "Editing an expense changed an unrelated row",
    );
    same(
      moved
        .filter((row) => row.id === created[0].id)
        .map((row) => ({
          id: row.id,
          name: row.name,
          amount: row.amount_minor,
          currency: row.currency,
          date: row.spent_on,
          category: row.category,
          userId: row.user_id,
          recurrence: row.recurrence,
          revision: row.revision,
        })),
      [
        {
          id: created[0].id,
          name: currentName,
          amount: 2501,
          currency: "EUR",
          date: "2026-11-01",
          category: "other",
          userId: account.id,
          recurrence: "once",
          revision: created[0].revision + 1,
        },
      ],
      "Expense edit did not persist exactly once in the destination month",
    );
    assertIsolated();
    await selectMonth("2026-10");
    await privateOverview();
    await initialBudget();
    await expect(page.getByText(currentName, { exact: true })).toHaveCount(0);
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][0],
    );

    target.setPhase(
      `${view} restored Money account ${index + 1} deletion confirmation boundary`,
    );
    await selectMonth("2026-11");
    target.setPhase(
      `${view} restored Money account ${index + 1} delete form opening`,
    );
    await main
      .getByRole("link", { name: `${currentName} löschen`, exact: true })
      .click();
    target.setPhase(
      `${view} restored Money account ${index + 1} unconfirmed delete submission`,
    );
    await page
      .getByRole("button", { name: "Jetzt löschen", exact: true })
      .click();
    target.setPhase(
      `${view} restored Money account ${index + 1} unconfirmed delete rejection`,
    );
    await expect(main.getByRole("alert")).toContainText("Bitte bestätige");
    same(
      expenses(target, database, account.id),
      moved,
      "Unconfirmed deletion changed the expense",
    );
    assertIsolated();
    target.setPhase(
      `${view} restored Money account ${index + 1} delete cancellation`,
    );
    await page
      .getByRole("link", { name: "Abbrechen und zurück", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-11$/);
    await page.reload();
    target.setPhase(
      `${view} restored Money account ${index + 1} cancelled delete persistence`,
    );
    await expect(ownEntry(currentName)).toBeVisible();
    await assertNovember("25,01 €");
    same(
      expenses(target, database, account.id),
      moved,
      "Cancelling deletion changed the expense",
    );

    target.setPhase(
      `${view} restored Money account ${index + 1} confirmed deletion`,
    );
    await main
      .getByRole("link", { name: `${currentName} löschen`, exact: true })
      .click();
    await page
      .getByLabel("Diesen Eintrag endgültig löschen", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Jetzt löschen", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-11$/);
    await page.reload();
    await assertNovember("Keine erfasst");
    await expect(page.getByText(currentName, { exact: true })).toHaveCount(0);
    same(
      expenses(target, database, account.id),
      ownBefore,
      "Confirmed deletion must remove only the created expense",
    );
    assertIsolated();
    await selectMonth("2026-10");
    await privateOverview();
    await initialBudget();
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][0],
    );
    for (const name of fixture.newNames) {
      await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    }

    target.setPhase(
      `${view} restored Money account ${index + 1} budget edit persistence`,
    );
    same(
      budgets(target, database, account.id),
      ownBudgetsBefore,
      "Expense lifecycle changed the budget definitions",
    );
    await selectMonth("2026-11");
    await assertNovember("Keine erfasst");
    const savedBudget = ownBudgetsBefore.find(
      (row) => row.id === fixture.budgetIds[1],
    );
    // Both viewports exercise the real edit form, then restore the original limit
    // through that same form. This keeps the existing expense cases independent.
    for (const [step, amount] of ["40,01", "20,00"].entries()) {
      await main
        .getByRole("link", { name: "Budget bearbeiten", exact: true })
        .click();
      await expect(page.getByLabel("Budgetmonat", { exact: true })).toHaveValue(
        "2026-11",
      );
      await expect(
        page.getByLabel("Budgetmonat", { exact: true }),
      ).toHaveAttribute("readonly", "");
      await page.getByLabel("Monatslimit (€)", { exact: true }).fill(amount);
      await page
        .getByRole("button", { name: "Budget speichern", exact: true })
        .click();
      await expect(page).toHaveURL(/\/account\/money\?month=2026-11$/);
      await page.reload();
      const currentBudgets = budgets(target, database, account.id);
      same(
        currentBudgets.filter((row) => row.id !== savedBudget.id),
        ownBudgetsBefore.filter((row) => row.id !== savedBudget.id),
        "Budget edit changed another month",
      );
      same(
        currentBudgets.filter((row) => row.id === savedBudget.id),
        [
          {
            ...savedBudget,
            amount_minor: step === 0 ? 4001 : 2000,
            revision: savedBudget.revision + step + 1,
          },
        ],
        "Budget edit did not persist the exact limit and revision",
      );
      same(
        expenses(target, database, account.id),
        ownBefore,
        "Budget edit changed expense rows",
      );
      assertIsolated();
      await assertBudget(
        fixture.budgetNames[1],
        "0,00 €",
        `${amount} €`,
        `${amount} €`,
        0,
      );
      await expect(main.getByTestId("month-available")).toHaveText(
        "Noch unvollständig",
      );
    }
    fixture.targetBudgets = budgets(target, database, account.id);
    await selectMonth("2026-10");
    await initialBudget();
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][0],
    );
    target.setPhase(
      `${view} restored Money account ${index + 1} foreign budget denial`,
    );
    await page.goto(
      `/account/money/budget/${foreign.budgetIds[0]}?month=2026-10`,
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await expect(
      page.getByLabel("Monatslimit (€)", { exact: true }),
    ).toHaveCount(0);
    for (const name of foreign.budgetNames) {
      await expect(page.getByText(name, { exact: true })).toHaveCount(0);
    }
    assertIsolated();

    target.setPhase(
      `${view} restored Money account ${index + 1} foreign record denial`,
    );
    await page.goto(`/account/money/expense/${foreign.id}?month=2026-10`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await expect(page.getByLabel("Betrag (€)", { exact: true })).toHaveCount(0);
    await expect(page.getByText(foreign.name, { exact: true })).toHaveCount(0);
    same(
      expenses(target, database, other.id),
      foreignBefore,
      "Denied route changed another account",
    );
    await page.goto(monthPath);
    await privateOverview();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Restored Money screen has horizontal overflow",
    );
    console.log(
      `Restored ${view} Money account ${index + 1} passed: saved month, exact creation/edit/month move, rejected and confirmed deletion, budget usage/edit/month isolation, source isolation and foreign-record denial.`,
    );
  },
});
