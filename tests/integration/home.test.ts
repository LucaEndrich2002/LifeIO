import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadHome } from "../../src/server/home";
import { moneySnapshotSchema } from "../../src/domain/transactions";
import { createTask, mutateTask } from "../supabase/task-fixtures";
import { createEvent } from "../supabase/calendar-fixtures";
import { homeGoalsSchema } from "../../src/domain/home";
import { goalSnapshotSchema } from "../../src/domain/goals";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { createLinkGoal, financialLinkGoal } from "../supabase/link-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
type Account = Awaited<ReturnType<typeof createPlanFixture>>;
const users: Account[] = [];
async function account(options?: Parameters<typeof createPlanFixture>[0]) {
  const user = await createPlanFixture(options);
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
async function read(user: Account, page = 0) {
  const result = await user.client.rpc("read_home_goals", {
    p_day: "2026-10-01",
    p_page: page,
  });
  expect(result.error).toBeNull();
  return homeGoalsSchema.parse(result.data);
}
describe("home goal summaries", () => {
  it("composes the same Money data with complete day counts, exclusive event boundaries and owner isolation", async () => {
    const user = await account(),
      foreign = await account();
    const { data: auth } = await user.client.auth.getUser();
    const { data: profile } = await user.client
      .from("profiles")
      .select("display_name,time_zone,onboarding(*)")
      .single();
    const context = {
      supabase: user.client,
      user: auth.user!,
      profile: profile!,
      onboarding: profile!.onboarding!,
    };
    for (let i = 0; i < 26; i++)
      await createTask(user, `Heute ${i}`, "2026-10-25");
    const done = await createTask(user, "Erledigt", "2026-10-25");
    expect(
      (await mutateTask(user, { p_id: done, p_operation: "complete" })).error,
    ).toBeNull();
    await createTask(user, "Überfällig", "2026-10-24");
    await createTask(foreign, "Fremde Aufgabe", "2026-10-25");
    await createEvent(user, "Am Tagesanfang beendet", {
      p_starts_at: "2026-10-24T21:00:00Z",
      p_ends_at: "2026-10-24T22:00:00Z",
    });
    await createEvent(user, "Langer Tag", {
      p_starts_at: "2026-10-24T22:00:00Z",
      p_ends_at: "2026-10-25T23:00:00Z",
    });
    await createEvent(user, "Erst morgen", {
      p_starts_at: "2026-10-25T23:00:00Z",
      p_ends_at: "2026-10-26T00:00:00Z",
    });
    await createEvent(foreign, "Fremder Termin", {
      p_starts_at: "2026-10-25T10:00:00Z",
      p_ends_at: "2026-10-25T11:00:00Z",
    });
    const home = await loadHome(
      context,
      "2026-09",
      0,
      new Date("2026-10-25T12:00:00Z"),
    );
    expect(home.money).toEqual(
      moneySnapshotSchema.parse(
        (await user.client.rpc("read_money_month", { p_month: "2026-09" }))
          .data,
      ),
    );
    expect(home.tasks.total).toBe(26);
    expect(home.tasks.items).toHaveLength(25);
    expect(home.events.total).toBe(1);
    expect(home.events.items[0]?.title).toBe("Langer Tag");
    expect(home.overdue.total).toBe(1);
    expect(home.overdue.items[0]?.title).toBe("Überfällig");
    expect(home.goals.total).toBe(1);
    const otherMonth = await loadHome(
      context,
      "2026-10",
      0,
      new Date("2026-10-25T12:00:00Z"),
    );
    expect(otherMonth.tasks).toEqual(home.tasks);
    expect(otherMonth.events).toEqual(home.events);
    expect(otherMonth.money.totals.income_count).toBe(0);
  });
  it("uses the same actual balance and rate history as goal details, excluding cancelled deposits", async () => {
    const user = await account(),
      id = await financialLinkGoal(user),
      entry = randomUUID();
    const before = await user.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "contribute",
          p_id: id,
          p_entry_id: entry,
          p_revision: 0,
          p_payload: { amount: 5000, date: "2026-09-30", note: "" },
        })
      ).error,
    ).toBeNull();
    const detail = goalSnapshotSchema.parse(
      (await user.client.rpc("read_goal", { p_id: id })).data,
    );
    const summary = (await read(user)).items[0]!;
    expect(summary).toMatchObject({
      balance: detail.balance,
      target_minor: detail.goal.target_minor,
      rates: detail.rates,
    });
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "cancel",
          p_id: id,
          p_entry_id: entry,
          p_revision: 1,
          p_payload: {},
        })
      ).error,
    ).toBeNull();
    expect((await read(user)).items[0]).toMatchObject({ balance: 350000 });
    expect(
      (await user.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(before.data);
  });
  it("counts all milestones beyond a detail page and excludes removed milestones", async () => {
    const user = await account({ skipGoal: true }),
      id = await createLinkGoal(user);
    let first = "";
    for (let i = 0; i < 26; i++) {
      const mid = randomUUID();
      first ||= mid;
      expect(
        (
          await user.client.rpc("mutate_goal_milestone", {
            p_operation: "create",
            p_goal_id: id,
            p_id: mid,
            p_revision: 0,
            p_title: `Schritt ${i}`,
          })
        ).error,
      ).toBeNull();
      if (i < 25)
        expect(
          (
            await user.client.rpc("mutate_goal_milestone", {
              p_operation: "complete",
              p_goal_id: id,
              p_id: mid,
              p_revision: 0,
            })
          ).error,
        ).toBeNull();
    }
    expect((await read(user)).items[0]).toMatchObject({
      milestone_total: 26,
      milestone_completed: 25,
      reached: false,
    });
    expect(
      (
        await user.client.rpc("mutate_goal_milestone", {
          p_operation: "remove",
          p_goal_id: id,
          p_id: first,
          p_revision: 1,
        })
      ).error,
    ).toBeNull();
    expect((await read(user)).items[0]).toMatchObject({
      milestone_total: 25,
      milestone_completed: 24,
    });
  });
  it("counts all goals and overdue dates across pages, sorts open deadlines first and preserves empty pages", async () => {
    const user = await account({ skipGoal: true });
    for (let i = 0; i < 26; i++) await createLinkGoal(user, `Ziel ${i}`);
    const urgent = await createLinkGoal(user, "Frist");
    expect(
      (
        await user.client.rpc("mutate_personal_goal", {
          p_operation: "update",
          p_id: urgent,
          p_revision: 0,
          p_name: "Frist",
          p_deadline: "2026-09-30",
        })
      ).error,
    ).toBeNull();
    const first = await read(user);
    expect(first).toMatchObject({ total: 27, overdue: 1 });
    expect(first.items).toHaveLength(6);
    expect(first.items[0]?.id).toBe(urgent);
    const ids = first.items.map((goal) => goal.id);
    for (let page = 1; page < 5; page++)
      ids.push(...(await read(user, page)).items.map((goal) => goal.id));
    expect(new Set(ids).size).toBe(27);
    expect((await read(user, 5)).items).toHaveLength(0);
    expect(
      (await user.client.rpc("read_home_goals", { p_day: "2026-09-30" })).data,
    ).toMatchObject({ overdue: 0 });
    const mid = randomUUID();
    await user.client.rpc("mutate_goal_milestone", {
      p_operation: "create",
      p_goal_id: urgent,
      p_id: mid,
      p_revision: 0,
      p_title: "Fertig",
    });
    await user.client.rpc("mutate_goal_milestone", {
      p_operation: "complete",
      p_goal_id: urgent,
      p_id: mid,
      p_revision: 0,
    });
    expect((await read(user)).overdue).toBe(0);
    expect((await read(user, 4)).items.at(-1)?.id).toBe(urgent);
  });
  it("isolates two owners and denies anonymous or unfinished access", async () => {
    const a = await account({ skipGoal: true }),
      b = await account(),
      unfinished = await account({ complete: false });
    await createLinkGoal(b, "Privates Ziel B");
    expect(await read(a)).toEqual({ items: [], total: 0, overdue: 0 });
    expect((await read(b)).total).toBe(2);
    expect(
      (await publicClient().rpc("read_home_goals", { p_day: "2026-10-01" }))
        .error,
    ).not.toBeNull();
    expect(
      (await unfinished.client.rpc("read_home_goals", { p_day: "2026-10-01" }))
        .error?.code,
    ).toBe("42501");
  });
  it("rejects invalid dates and unbounded pages without modifying data", async () => {
    const user = await account();
    const before = await read(user);
    for (const args of [
      { p_day: "2026-02-30" },
      { p_day: "wrong" },
      { p_day: "2026-10-01", p_page: -1 },
      { p_day: "2026-10-01", p_page: 1000001 },
    ])
      expect(
        (await user.client.rpc("read_home_goals", args)).error,
      ).not.toBeNull();
    expect(await read(user)).toEqual(before);
  });
});
