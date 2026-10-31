import { randomUUID } from "node:crypto";
import { expect as baseExpect } from "@playwright/test";
import { rehearseRecoveryBrowser } from "./recovery-browser-scenario.mjs";
import { check, same } from "./isolated-database.mjs";

const expect = baseExpect.configure({ timeout: 15000 });
const fixtures = new Map();
const monthPath = "/account/money?month=2026-10";
const balances = [
  ["1.776,56 €", "1.765,57 €", "1.754,58 €"],
  ["1.665,45 €", "1.654,46 €", "1.643,47 €"],
];

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
      fixture.sourceRows = expenses(source, source.source, account.id);
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
    const main = page.getByRole("main");
    const ownEntry = (name) =>
      main.getByRole("link", { name: `${name} bearbeiten`, exact: true });
    async function privateOverview() {
      await expect(ownEntry(fixture.name)).toHaveCount(1);
      await expect(ownEntry(fixture.name)).toBeVisible();
      // Privacy assertions deliberately include the entire document.
      for (const name of [foreign.name, ...foreign.newNames]) {
        await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      }
    }

    target.setPhase(
      `${view} restored Money account ${index + 1} saved month read`,
    );
    await page.goto(monthPath);
    await privateOverview();
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][visit],
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
    for (const name of fixture.newNames.slice(0, visit + 1)) {
      await expect(ownEntry(name)).toHaveCount(1);
      await expect(ownEntry(name)).toBeVisible();
    }
    await expect(main.getByTestId("month-available")).toHaveText(
      balances[index][visit + 1],
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
    same(
      expenses(target, database, other.id),
      foreignBefore,
      "Own write changed another account",
    );
    for (const entry of accounts) {
      same(
        expenses(source, source.source, entry.id),
        fixtures.get(entry.id).sourceRows,
        "Browser write changed the backup source",
      );
    }

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
      `Restored ${view} Money account ${index + 1} passed: saved month, one exact expense, source isolation and foreign-record denial.`,
    );
  },
});
