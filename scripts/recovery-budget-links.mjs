import { randomUUID } from "node:crypto";
import { expect as baseExpect } from "@playwright/test";
import { check, same } from "./isolated-database.mjs";

const expect = baseExpect.configure({ timeout: 15000 });
const goalTables = [
  "goals",
  "goal_rates",
  "goal_contributions",
  "goal_milestones",
];

function rows(context, database, userId, table) {
  const order = table === "goal_rates" ? "goal_id,month" : "id";
  return JSON.parse(
    context.sql(
      database,
      `select coalesce(jsonb_agg(to_jsonb(r) order by ${order}),'[]'::jsonb) from public.${table} r where user_id='${userId}';`,
    ),
  );
}

function goals(context, database, userId) {
  return goalTables.map((table) => rows(context, database, userId, table));
}

export function prepareBudgetLinks(source, account, fixture, index) {
  source.setPhase(`fictional budget link fixtures for account ${index + 1}`);
  fixture.goalIds = [randomUUID(), randomUUID()];
  fixture.goalNames = ["Sparziel", "Persönliches Ziel"].map(
    (kind) => `${kind} Konto ${index + 1}`,
  );
  fixture.linkIds = [randomUUID(), randomUUID()];
  source.sql(
    source.source,
    `begin; set local role authenticated;
    set local request.jwt.claim.sub='${account.id}';
    select public.mutate_goal('create','${fixture.goalIds[0]}','${randomUUID()}',0,'${JSON.stringify({ name: fixture.goalNames[0], target: 1000000, opening: 350000, monthly: 0, month: "2026-10", deadline: null })}');
    select public.mutate_personal_goal('create','${fixture.goalIds[1]}',0,'${fixture.goalNames[1]}','');
    select public.mutate_goal_budget_link('create','${fixture.linkIds[0]}','${fixture.goalIds[0]}','${fixture.budgetIds[0]}');
    select public.mutate_goal_budget_link('create','${fixture.linkIds[1]}','${fixture.goalIds[1]}','${fixture.budgetIds[0]}');
    commit;`,
  );
  fixture.sourceGoals = goals(source, source.source, account.id);
  fixture.sourceLinks = rows(source, source.source, account.id, "entity_links");
}

export async function verifyBudgetLinks({
  page,
  view,
  index,
  account,
  accounts,
  target,
  database,
  source,
  fixtures,
  assertFinance,
}) {
  const fixture = fixtures.get(account.id);
  const other = accounts[1 - index];
  const foreign = fixtures.get(other.id);
  const links = () => rows(target, database, account.id, "entity_links");
  const before = links();
  const foreignBefore = rows(target, database, other.id, "entity_links");
  const main = page.getByRole("main");
  const section = page.getByRole("region", {
    name: "Verknüpfte Monatsbudgets",
  });
  const goalPath = `/account/goals/${fixture.goalIds[1]}`;
  const goalDestination = new RegExp(`${goalPath}#budgets$`);

  function preserved() {
    assertFinance();
    for (const owner of accounts) {
      const saved = fixtures.get(owner.id);
      same(
        goals(target, database, owner.id),
        saved.sourceGoals,
        "Budget linking changed goal data after restore",
      );
      same(
        goals(source, source.source, owner.id),
        saved.sourceGoals,
        "Budget linking changed source goals",
      );
      same(
        rows(source, source.source, owner.id, "entity_links"),
        saved.sourceLinks,
        "Budget linking changed source links",
      );
    }
    same(
      rows(target, database, other.id, "entity_links"),
      foreignBefore,
      "Budget linking changed another account's links",
    );
  }
  async function privatePage() {
    for (const name of [...foreign.goalNames, ...foreign.budgetNames]) {
      await expect(page.getByText(name, { exact: false })).toHaveCount(0);
    }
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Restored budget link page has horizontal overflow",
    );
  }
  async function linked(monthIndex, exists = true) {
    await expect(
      section.getByRole("heading", {
        name: fixture.budgetNames[monthIndex],
        exact: true,
      }),
    ).toHaveCount(exists ? 1 : 0);
  }
  async function novemberReverse(exists) {
    await page.goto(`/account/money/budget/${fixture.budgetIds[1]}/goals`);
    await expect(
      main.getByRole("link", {
        name: `${fixture.goalNames[1]} öffnen`,
        exact: true,
      }),
    ).toHaveCount(exists ? 1 : 0);
    await expect(
      main.getByRole("link", {
        name: `${fixture.goalNames[0]} öffnen`,
        exact: true,
      }),
    ).toHaveCount(0);
    if (!exists) await expect(main).toContainText("noch keine Ziele verknüpft");
    await privatePage();
  }

  target.setPhase(
    `${view} restored Money account ${index + 1} saved budget links`,
  );
  same(
    before,
    fixture.targetLinks ?? fixture.sourceLinks,
    "Restored links differ from the saved or previously verified state",
  );
  preserved();
  await page.goto("/account/money?month=2026-10");
  await main
    .getByRole("link", { name: "Verknüpfte Ziele ansehen", exact: true })
    .click();
  await expect(page).toHaveURL(
    `/account/money/budget/${fixture.budgetIds[0]}/goals`,
  );
  for (const name of fixture.goalNames) {
    await expect(
      main.getByRole("link", { name: `${name} öffnen`, exact: true }),
    ).toHaveCount(1);
  }
  await privatePage();
  for (const [kind, id] of fixture.goalIds.entries()) {
    await main
      .getByRole("link", {
        name: `${fixture.goalNames[kind]} öffnen`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/account/goals/${id}#budgets`);
    await page.reload();
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      fixture.goalNames[kind],
    );
    await linked(0);
    await linked(1, false);
    await expect(section).toContainText("reserviert kein Geld");
    if (kind === 0)
      await expect(main.getByTestId("goal-balance")).toHaveText("3.500,00 €");
    else await expect(main.getByTestId("goal-balance")).toHaveCount(0);
    await privatePage();
    await section
      .getByRole("link", {
        name: new RegExp(`^${fixture.budgetNames[0]}.*öffnen$`),
      })
      .click();
    await expect(page).toHaveURL(/\/account\/money\?month=2026-10#budget$/);
    await main
      .getByRole("link", { name: "Verknüpfte Ziele ansehen", exact: true })
      .click();
    await expect(page).toHaveURL(
      `/account/money/budget/${fixture.budgetIds[0]}/goals`,
    );
  }
  same(links(), before, "Navigating saved links changed data");
  preserved();

  target.setPhase(
    `${view} restored Money account ${index + 1} new budget link`,
  );
  await page.goto(goalPath);
  await section
    .getByRole("link", { name: "Monatsbudget verknüpfen", exact: true })
    .click();
  await page.getByLabel("Budgetmonat", { exact: true }).fill("2026-11");
  await main
    .getByRole("button", { name: "Budget suchen", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`${goalPath}/budgets/new\\?month=2026-11$`),
  );
  await expect(
    main.getByRole("heading", { name: fixture.budgetNames[1], exact: true }),
  ).toBeVisible();
  await privatePage();
  const id = await main.locator('input[name="id"]').inputValue();
  const submit = main.getByRole("button", {
    name: "Dieses Budget verknüpfen",
    exact: true,
  });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(goalDestination);
  await page.reload();
  await linked(0);
  await linked(1);
  const created = links();
  same(
    created.filter((row) => row.id !== id),
    before,
    "Creating a link changed existing links",
  );
  same(
    created
      .filter((row) => row.id === id)
      .map((row) => ({
        id: row.id,
        owner: row.user_id,
        goal: row.goal_id,
        budget: row.budget_id,
        relationship: row.relationship,
        removed: row.removed_at,
      })),
    [
      {
        id,
        owner: account.id,
        goal: fixture.goalIds[1],
        budget: fixture.budgetIds[1],
        relationship: "funded_by",
        removed: null,
      },
    ],
    "New budget link must persist exactly once",
  );
  preserved();
  await novemberReverse(true);
  // A reload of the creation route must offer no second create action.
  await page.goto(`${goalPath}/budgets/new?month=2026-11`);
  await expect(main.getByRole("status")).toContainText(
    "bereits mit dem Ziel verknüpft",
  );
  await expect(
    main.getByRole("button", { name: "Dieses Budget verknüpfen" }),
  ).toHaveCount(0);
  same(links(), created, "Reopening a linked month duplicated its link");

  target.setPhase(
    `${view} restored Money account ${index + 1} link removal confirmation`,
  );
  await page.goto(goalPath);
  const remove = () =>
    section
      .getByRole("link", {
        name: new RegExp(
          `^Verknüpfung mit ${fixture.budgetNames[1]}.*entfernen$`,
        ),
      })
      .click();
  await remove();
  await main
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(main.getByRole("alert")).toContainText("Bitte bestätige");
  same(links(), created, "Unconfirmed removal changed a link");
  preserved();
  await main
    .getByRole("link", { name: "Abbrechen und zurück", exact: true })
    .click();
  await expect(page).toHaveURL(goalDestination);
  await page.reload();
  await linked(1);
  same(links(), created, "Cancelling removal changed a link");
  preserved();
  await remove();
  await page
    .getByLabel(
      "Nur diese Verknüpfung entfernen. Ziel und Budget bleiben erhalten.",
      { exact: true },
    )
    .check();
  await main
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(page).toHaveURL(goalDestination);
  await page.reload();
  await linked(0);
  await linked(1, false);
  const removed = links();
  same(
    removed.filter((row) => row.id !== id),
    before,
    "Removal changed other links",
  );
  const tombstone = removed.find((row) => row.id === id);
  check(
    typeof tombstone?.removed_at === "string" &&
      Number.isFinite(Date.parse(tombstone.removed_at)),
    "Removed link must retain its request ID with a removal timestamp",
  );
  same(
    { ...tombstone, removed_at: null },
    created.find((row) => row.id === id),
    "Removal changed fields other than the removal timestamp",
  );
  preserved();
  await novemberReverse(false);

  target.setPhase(
    `${view} restored Money account ${index + 1} private link routes`,
  );
  for (const path of [
    `${goalPath}/budgets/${id}`,
    `${goalPath}/budgets/${foreign.linkIds[0]}`,
    `/account/goals/${foreign.goalIds[0]}/budgets/new?month=2026-10`,
    `/account/money/budget/${foreign.budgetIds[0]}/goals`,
  ]) {
    await page.goto(path);
    await expect(main.getByRole("heading", { level: 1 })).toContainText(
      "Seite",
    );
    await expect(
      main.getByRole("button", {
        name: /Dieses Budget verknüpfen|Entfernen bestätigen/,
      }),
    ).toHaveCount(0);
    await privatePage();
  }
  same(links(), removed, "Denied routes changed or resurrected a link");
  preserved();
  fixture.targetLinks = removed;
}
