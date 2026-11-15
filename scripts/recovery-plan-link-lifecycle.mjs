import { expect as baseExpect } from "@playwright/test";
import { check, same } from "./isolated-database.mjs";
import { applicationRows } from "./recovery-plan-links.mjs";

const expect = baseExpect.configure({ timeout: 15000 });

export async function verifyPlanLinkLifecycle({
  kind,
  page,
  view,
  index,
  account,
  accounts,
  source,
  target,
  database,
  fixtures,
}) {
  check(kind === "task" || kind === "event", "Unexpected Plan link kind");
  const event = kind === "event";
  const label = event ? "Termin" : "Aufgabe";
  const plural = event ? "Termine" : "Aufgaben";
  const goalIndex = event ? 0 : 1;
  const targetField = event ? "calendar_event_id" : "task_id";
  const otherField = event ? "task_id" : "calendar_event_id";
  const own = fixtures.get(account.id);
  const foreign = fixtures.get(accounts[1 - index].id);
  const before = applicationRows(target, database);
  const sourceBefore = applicationRows(source, source.source);
  const goal = own.goalIds[goalIndex];
  const endpoint = own.unlinkedPlan[kind];
  const listPath = `/account/goals/${goal}/plan?kind=${kind}&mode=linked&page=0`;
  const endpointPath = `/account/plan/${event ? "calendar/" : ""}${endpoint.id}`;
  const targetGoalsPath = `${endpointPath}/goals`;
  const main = page.getByRole("main");
  const snapshot = () => applicationRows(target, database);
  async function privatePage() {
    for (const title of [
      ...foreign.goalNames,
      ...Object.values(foreign.unlinkedPlan).map((entry) => entry.title),
      ...foreign.plan.map((entry) => entry.title),
    ])
      await expect(page.getByText(title, { exact: false })).toHaveCount(0);
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Restored ${kind} link form has horizontal overflow`,
    );
  }
  function preserved(state, id) {
    same(
      {
        ...state,
        entity_links: state.entity_links.filter((row) => row.id !== id),
      },
      before,
      `${kind} linking changed other restored application data`,
    );
    same(
      applicationRows(source, source.source),
      sourceBefore,
      `${kind} linking changed backup source data`,
    );
  }
  target.setPhase(`${view} restored account ${index + 1} new ${kind} link`);
  await page.goto(listPath);
  await main
    .getByRole("link", { name: `${label} verknüpfen`, exact: true })
    .click();
  await main
    .getByRole("link", { name: `${endpoint.title} auswählen`, exact: true })
    .click();
  await expect(
    main.getByRole("heading", { name: endpoint.title, exact: true }),
  ).toBeVisible();
  const id = await main.locator('input[name="id"]').inputValue();
  check(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    `Unexpected ${kind} link request ID`,
  );
  await privatePage();
  await main
    .getByRole("button", { name: `${label} mit Ziel verknüpfen`, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(listPath);
  await page.reload();
  await expect(main.getByRole("status")).toHaveText(`2 ${plural} verknüpft`);
  await expect(
    main.getByRole("link", { name: `${endpoint.title} öffnen`, exact: true }),
  ).toBeVisible();
  const created = snapshot();
  const row = created.entity_links.find((entry) => entry.id === id);
  check(
    row?.user_id === account.id &&
      row.goal_id === goal &&
      row[targetField] === endpoint.id &&
      row.relationship === (event ? "scheduled_as" : "requires") &&
      row.removed_at === null &&
      row.budget_id === null &&
      row[otherField] === null,
    `New ${kind} link was not stored with the expected owner and endpoints`,
  );
  preserved(created, id);
  await privatePage();
  await page.goto(
    `/account/goals/${goal}/plan/${kind}/new?target=${endpoint.id}`,
  );
  await expect(main.getByRole("status")).toContainText("bereits");
  await expect(
    main.getByRole("button", {
      name: `${label} mit Ziel verknüpfen`,
      exact: true,
    }),
  ).toHaveCount(0);
  same(
    snapshot(),
    created,
    `Reopening ${kind} link creation duplicated a link`,
  );
  await privatePage();

  target.setPhase(
    `${view} restored account ${index + 1} ${kind} unlink confirmation`,
  );
  await page.goto(targetGoalsPath);
  await expect(main.getByRole("status")).toHaveText("1 Ziel verknüpft");
  await expect(
    main.getByRole("link", {
      name: `${own.goalNames[goalIndex]} öffnen`,
      exact: true,
    }),
  ).toBeVisible();
  const remove = () =>
    main
      .getByRole("link", {
        name: `Verknüpfung mit ${own.goalNames[goalIndex]} entfernen`,
        exact: true,
      })
      .click();
  await remove();
  await main
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(main.getByRole("alert")).toContainText("Bitte bestätige");
  same(snapshot(), created, `Unconfirmed ${kind} unlink changed data`);
  await privatePage();
  await main
    .getByRole("link", { name: "Abbrechen und zurück", exact: true })
    .click();
  await expect(page).toHaveURL(`${targetGoalsPath}?page=0`);
  await page.reload();
  await expect(main.getByRole("status")).toHaveText("1 Ziel verknüpft");
  same(snapshot(), created, `Cancelled ${kind} unlink changed data`);
  await remove();
  await main
    .getByRole("checkbox", {
      name: `Nur diese Verknüpfung entfernen. Ziel und ${label} bleiben erhalten.`,
      exact: true,
    })
    .check();
  await main
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(page).toHaveURL(`${targetGoalsPath}?page=0`);
  await page.reload();
  await expect(main.getByRole("status")).toHaveText("0 Ziele verknüpft");
  await expect(main).toContainText("Noch keine Ziele verknüpft.");
  const removed = snapshot();
  const tombstone = removed.entity_links.find((entry) => entry.id === id);
  check(
    typeof tombstone?.removed_at === "string" &&
      Number.isFinite(Date.parse(tombstone.removed_at)),
    `Removed ${kind} link lost its request ID or timestamp`,
  );
  same(
    { ...tombstone, removed_at: null },
    row,
    `${kind} unlink changed fields besides removal time`,
  );
  preserved(removed, id);
  await privatePage();
  await page.goto(listPath);
  await expect(main.getByRole("status")).toHaveText(`1 ${label} verknüpft`);
  await expect(
    main.getByRole("link", { name: `${endpoint.title} öffnen`, exact: true }),
  ).toHaveCount(0);
  await page.goto(endpointPath);
  await expect(
    page.getByLabel(event ? "Titel des Termins" : "Titel der Aufgabe", {
      exact: true,
    }),
  ).toHaveValue(endpoint.title);
  await page.goto(`/account/goals/${goal}/plan/${kind}/${id}`);
  await expect(main.getByRole("heading", { level: 1 })).toContainText("Seite");
  await expect(
    main.getByRole("button", { name: "Entfernen bestätigen", exact: true }),
  ).toHaveCount(0);
  await privatePage();
  same(
    snapshot(),
    removed,
    `Removed ${kind} link route changed or resurrected data`,
  );
  preserved(removed, id);
  // The next viewport's existing budget-link checks include the new tombstone.
  own.targetLinks = removed.entity_links
    .filter((entry) => entry.user_id === account.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  console.log(
    `Restored ${view} account ${index + 1} ${kind} link lifecycle passed: create, duplicate guard, rejected/cancelled/confirmed unlink, preserved endpoints and full source/target isolation.`,
  );
}
