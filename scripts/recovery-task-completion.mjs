import { expect as baseExpect } from "@playwright/test";
import { check, same } from "./isolated-database.mjs";
import { applicationRows } from "./recovery-plan-links.mjs";

const expect = baseExpect.configure({ timeout: 15000 });

export async function verifyTaskCompletion({
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
  const own = fixtures.get(account.id);
  const foreign = fixtures.get(accounts[1 - index].id);
  const task = own.plan.find((entry) => entry.kind === "task");
  const before = applicationRows(target, database);
  const sourceBefore = applicationRows(source, source.source);
  const original = before.tasks.find((row) => row.id === task.id);
  check(
    original?.user_id === account.id &&
      original.completed_at === null &&
      original.removed_at === null,
    "Expected an own open restored task",
  );
  const main = page.getByRole("main");
  const title = main.getByRole("heading", { name: task.title, exact: true });
  async function privatePage() {
    for (const name of [
      ...foreign.goalNames,
      ...foreign.plan.map((entry) => entry.title),
      ...Object.values(foreign.unlinkedPlan).map((entry) => entry.title),
    ])
      await expect(page.getByText(name, { exact: false })).toHaveCount(0);
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Restored task completion has horizontal overflow",
    );
  }
  function preserved(completed, revision) {
    const state = applicationRows(target, database);
    const row = state.tasks.find((entry) => entry.id === task.id);
    check(
      row?.revision === original.revision + revision &&
        (completed
          ? typeof row.completed_at === "string" &&
            Number.isFinite(Date.parse(row.completed_at))
          : row.completed_at === null),
      "Restored task completion status or revision is incorrect",
    );
    same(
      { ...row, revision: original.revision, completed_at: null },
      original,
      "Task completion changed other task fields",
    );
    same(
      { ...state, tasks: before.tasks },
      before,
      "Task completion changed links, goals or other application tables",
    );
    same(
      state.tasks.filter((entry) => entry.id !== task.id),
      before.tasks.filter((entry) => entry.id !== task.id),
      "Task completion changed another task or account",
    );
    same(
      applicationRows(source, source.source),
      sourceBefore,
      "Task completion changed backup source data",
    );
  }
  for (const [step, completed] of [true, false].entries()) {
    const phase = `${view} restored account ${index + 1} task ${completed ? "completion" : "reopening"}`;
    target.setPhase(`${phase} list`);
    const status = completed ? "open" : "completed";
    const path = `/account/plan?view=all&status=${status}&day=2026-10-15&page=0`;
    await page.goto(path);
    await expect(title).toBeVisible();
    await privatePage();
    target.setPhase(`${phase} submit`);
    await main
      .getByRole("button", {
        name: `${completed ? "Als erledigt markieren" : "Wieder öffnen"}: ${task.title}`,
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect(title).toHaveCount(0);
    await page.reload();
    await expect(title).toHaveCount(0);
    target.setPhase(`${phase} status navigation`);
    await main
      .getByRole("navigation", { name: "Aufgabenstatus" })
      .getByRole("link", {
        name: completed ? "Erledigt" : "Offen",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      `/account/plan?view=all&status=${completed ? "completed" : "open"}&day=2026-10-15&page=0`,
    );
    await page.reload();
    await expect(title).toBeVisible();
    await expect(
      main.getByRole("button", {
        name: `${completed ? "Wieder öffnen" : "Als erledigt markieren"}: ${task.title}`,
        exact: true,
      }),
    ).toBeVisible();
    await privatePage();
    target.setPhase(`${phase} persisted state`);
    preserved(completed, step + 1);
    for (const goal of own.goalIds) {
      target.setPhase(`${phase} linked goal status`);
      await page.goto(
        `/account/goals/${goal}/plan?kind=task&mode=linked&page=0`,
      );
      await expect(main.getByRole("status")).toHaveText("1 Aufgabe verknüpft");
      await expect(title).toBeVisible();
      await expect(
        main.getByText(
          `${completed ? "Erledigt" : "Offen"} · Priorität: Hoch`,
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        main.getByText("Ohne Fälligkeitsdatum", { exact: true }),
      ).toBeVisible();
      await privatePage();
    }
    preserved(completed, step + 1);
  }
  console.log(
    `Restored ${view} account ${index + 1} task completion passed: keyboard completion/reopening, reload and status filters, both goal links, unchanged other data and source.`,
  );
}
