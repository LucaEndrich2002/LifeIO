import { randomUUID } from "node:crypto";
import { expect as baseExpect } from "@playwright/test";
import { check, same } from "./isolated-database.mjs";

const expect = baseExpect.configure({ timeout: 15000 });
const kinds = ["task", "event"];
const targetPath = (kind, id) =>
  `/account/plan/${kind === "event" ? "calendar/" : ""}${id}`;

export function preparePlanLinks(source, account, fixture, index) {
  source.setPhase(`fictional saved Plan links for account ${index + 1}`);
  fixture.unlinkedPlan = {
    task: { id: randomUUID(), title: `Weitere Aufgabe Konto ${index + 1}` },
    event: { id: randomUUID(), title: `Weiterer Termin Konto ${index + 1}` },
  };
  source.sql(
    source.source,
    `begin; set local role authenticated;
    set local request.jwt.claim.sub='${account.id}';
    select public.mutate_task('create','${fixture.unlinkedPlan.task.id}',0,'${fixture.unlinkedPlan.task.title}','normal','');
    select public.mutate_calendar_event('create','${fixture.unlinkedPlan.event.id}',0,'${fixture.unlinkedPlan.event.title}','2026-10-16T08:00:00Z','2026-10-16T09:00:00Z','Europe/Berlin');
    commit;`,
  );
  fixture.plan = kinds.map((kind) => ({
    kind,
    id: randomUUID(),
    title: `${kind === "task" ? "Aufgabe" : "Termin"} Konto ${index + 1}`,
    links: fixture.goalIds.map(() => randomUUID()),
  }));
  for (const entry of fixture.plan) {
    source.sql(
      source.source,
      `begin; set local role authenticated;
      set local request.jwt.claim.sub='${account.id}';
      ${
        entry.kind === "task"
          ? `select public.mutate_task('create','${entry.id}',0,'${entry.title}','high','');`
          : `select public.mutate_calendar_event('create','${entry.id}',0,'${entry.title}','2026-10-14T21:30:00Z','2026-10-15T00:00:00Z','Europe/Berlin');`
      }
      ${fixture.goalIds.map((goal, i) => `select public.mutate_goal_plan_link('create','${entry.links[i]}','${goal}','${entry.kind}','${entry.id}');`).join("\n")}
      commit;`,
    );
  }
}

// Snapshot every application table without emitting row contents on failure.
export function applicationRows(context, database) {
  const tables = JSON.parse(
    context.sql(
      database,
      `select jsonb_agg(tablename order by tablename) from pg_tables where schemaname='public';`,
    ),
  );
  check(
    tables.length > 0 &&
      tables.every((table) => /^[a-z_][a-z0-9_]*$/.test(table)),
    "Unexpected application table inventory",
  );
  return JSON.parse(
    context.sql(
      database,
      `select jsonb_build_object(${tables.map((table) => `'${table}',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from public.${table} r)`).join(",")});`,
    ),
  );
}

export async function verifyPlanLinks({
  page,
  view,
  index,
  account,
  accounts,
  target,
  database,
  source,
  fixtures,
}) {
  const own = fixtures.get(account.id);
  const foreign = fixtures.get(accounts[1 - index].id);
  const before = applicationRows(target, database);
  const sourceBefore = applicationRows(source, source.source);
  const main = page.getByRole("main");
  async function privatePage() {
    for (const name of [
      ...foreign.goalNames,
      ...foreign.plan.map((entry) => entry.title),
    ]) {
      await expect(page.getByText(name, { exact: false })).toHaveCount(0);
    }
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Restored Plan links have horizontal overflow",
    );
  }
  function preserved() {
    same(
      applicationRows(target, database),
      before,
      "Reading Plan links changed restored application data",
    );
    same(
      applicationRows(source, source.source),
      sourceBefore,
      "Reading Plan links changed source application data",
    );
  }

  target.setPhase(`${view} restored account ${index + 1} saved Plan links`);
  for (const entry of own.plan) {
    const plural = entry.kind === "task" ? "Aufgaben" : "Termine";
    for (const [goalIndex, goalId] of own.goalIds.entries()) {
      await page.goto(`/account/goals/${goalId}`);
      await main
        .getByRole("link", { name: `Verknüpfte ${plural}`, exact: true })
        .click();
      await expect(page).toHaveURL(
        `/account/goals/${goalId}/plan?kind=${entry.kind}&mode=linked&page=0`,
      );
      await page.reload();
      await expect(main.getByRole("status")).toHaveText(
        `${entry.kind === "task" ? "1 Aufgabe" : "1 Termin"} verknüpft`,
      );
      await expect(
        main.getByRole("heading", { name: entry.title, exact: true }),
      ).toBeVisible();
      if (entry.kind === "task") {
        await expect(
          main.getByText("Offen · Priorität: Hoch", { exact: true }),
        ).toBeVisible();
        await expect(
          main.getByText("Ohne Fälligkeitsdatum", { exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          main.getByText("Beginn: 14.10.2026, 23:30 (UTC+02:00)", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          main.getByText("Ende: 15.10.2026, 02:00 (UTC+02:00)", {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          main.getByText(
            "Anzeige: Europe/Berlin · Terminzeitzone: Europe/Berlin",
            { exact: true },
          ),
        ).toBeVisible();
      }
      await privatePage();
      const open = main.getByRole("link", {
        name: `${entry.title} öffnen`,
        exact: true,
      });
      await open.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(targetPath(entry.kind, entry.id));
      await expect(
        page.getByLabel(
          entry.kind === "task" ? "Titel der Aufgabe" : "Titel des Termins",
          { exact: true },
        ),
      ).toHaveValue(entry.title);
      await privatePage();
      await main
        .getByRole("link", { name: "Verknüpfte Ziele", exact: true })
        .click();
      await expect(page).toHaveURL(`${targetPath(entry.kind, entry.id)}/goals`);
      await page.reload();
      await expect(main.getByRole("status")).toHaveText("2 Ziele verknüpft");
      for (const name of own.goalNames)
        await expect(
          main.getByRole("link", { name: `${name} öffnen`, exact: true }),
        ).toBeVisible();
      await privatePage();
      await main
        .getByRole("link", {
          name: `${own.goalNames[goalIndex]} öffnen`,
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(`/account/goals/${goalId}`);
      await expect(main.getByRole("heading", { level: 1 })).toHaveText(
        own.goalNames[goalIndex],
      );
      preserved();
    }
  }

  target.setPhase(
    `${view} restored account ${index + 1} foreign Plan link routes`,
  );
  for (const entry of foreign.plan) {
    for (const path of [
      `${targetPath(entry.kind, entry.id)}/goals`,
      `/account/goals/${foreign.goalIds[0]}/plan?kind=${entry.kind}`,
      `/account/goals/${own.goalIds[0]}/plan/${entry.kind}/${entry.links[0]}`,
      `/account/goals/${own.goalIds[0]}/plan/${entry.kind}/new?target=${entry.id}`,
    ]) {
      await page.goto(path);
      await expect(main.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
      await expect(
        main.getByRole("button", {
          name: /mit Ziel verknüpfen|Entfernen bestätigen/,
        }),
      ).toHaveCount(0);
      await privatePage();
    }
  }
  preserved();
  console.log(
    `Restored ${view} account ${index + 1} saved task/event links passed: both goal kinds, bidirectional navigation, midnight interval, keyboard access, account isolation and unchanged source/target application tables.`,
  );
}
