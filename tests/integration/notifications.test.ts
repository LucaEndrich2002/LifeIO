import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import { createTask, mutateTask } from "../supabase/task-fixtures";
import { createLinkBudget } from "../supabase/link-fixtures";
import {
  generateReview,
  reviewExpense,
  reviewWeek,
} from "../supabase/review-fixtures";
import {
  markNotification,
  notificationGoal,
  notificationPeriod,
  readNotifications,
  synchronize,
  type NotificationAccount,
} from "../supabase/notification-fixtures";

const users: NotificationAccount[] = [];
async function account(options?: Parameters<typeof createPlanFixture>[0]) {
  const user = await createPlanFixture(options);
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});

describe("owner-scoped persisted notifications", () => {
  it("evaluates four sources explicitly, keeps original context and deduplicates concurrent checks", async () => {
    const user = await account(),
      period = notificationPeriod();
    const task = await createTask(user, "Überfällig", period.yesterday);
    const goal = await notificationGoal(user, period.yesterday);
    const budget = await createLinkBudget(user, period.month);
    await reviewExpense(user, period.day, 45000);
    expect((await generateReview(user)).error).toBeNull();
    expect((await readNotifications(user)).total).toBe(0);
    const results = await Promise.all([synchronize(user), synchronize(user)]);
    expect(results.every((result) => !result.error)).toBe(true);
    expect(results.reduce((sum, result) => sum + result.data!, 0)).toBe(4);
    const original = await readNotifications(user);
    expect(original.total).toBe(4);
    expect(original.unread).toBe(4);
    expect(original.items.map((item) => item.kind).sort()).toEqual([
      "budget",
      "goal",
      "review",
      "task",
    ]);
    expect(original.items.find((item) => item.kind === "task")?.task_id).toBe(
      task,
    );
    expect(original.items.find((item) => item.kind === "goal")?.goal_id).toBe(
      goal,
    );
    expect(
      original.items.find((item) => item.kind === "budget")?.budget_id,
    ).toBe(budget);
    expect(
      original.items.find((item) => item.kind === "budget")?.context,
    ).toMatchObject({
      currency: "EUR",
      spent_minor: 45000,
      limit_minor: 50000,
    });
    const item = original.items[0]!;
    expect((await markNotification(user, item.id, true)).error).toBeNull();
    const seen = await readNotifications(user);
    await reviewExpense(user, period.day, 9999);
    expect((await generateReview(user, reviewWeek, 0)).error).toBeNull();
    expect((await synchronize(user)).data).toBe(0);
    expect(await readNotifications(user)).toEqual(seen);
    expect((await readNotifications(user, "unread")).total).toBe(3);
  });
  it("persists read/unread states, repeats idempotently and rejects stale opposing changes", async () => {
    const user = await account();
    await createTask(user, "Status", "2026-01-01");
    expect((await synchronize(user)).error).toBeNull();
    const item = (await readNotifications(user)).items[0]!;
    const concurrent = await Promise.all([
      markNotification(user, item.id, true),
      markNotification(user, item.id, true),
    ]);
    expect(concurrent.every((result) => !result.error)).toBe(true);
    const read = (await readNotifications(user)).items[0]!;
    expect(read.revision).toBe(1);
    expect(read.read_at).not.toBeNull();
    expect((await markNotification(user, item.id, false, 0)).error?.code).toBe(
      "40001",
    );
    expect((await readNotifications(user)).items[0]).toEqual(read);
    expect((await markNotification(user, item.id, false, 1)).error).toBeNull();
    expect((await readNotifications(user)).items[0]).toMatchObject({
      read_at: null,
      revision: 2,
    });
    expect((await synchronize(user)).data).toBe(0);
    expect((await readNotifications(user)).unread).toBe(1);
  });
  it("uses complete source lists and stable 25-row pages with complete unread counts", async () => {
    const user = await account();
    for (let i = 0; i < 27; i++)
      await createTask(user, `Aufgabe ${i}`, "2026-01-01");
    expect((await synchronize(user)).data).toBe(27);
    const first = await readNotifications(user),
      second = await readNotifications(user, "all", 1);
    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(2);
    expect(first.total).toBe(27);
    expect(second.unread).toBe(27);
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
    ).toBe(27);
    expect(await readNotifications(user)).toEqual(first);
    expect(
      (await markNotification(user, first.items[0]!.id, true)).error,
    ).toBeNull();
    expect((await readNotifications(user, "unread", 1)).items).toHaveLength(1);
    expect((await readNotifications(user, "all", 2)).items).toEqual([]);
  });
  it("uses the current profile day/month and excludes due-today, undated, completed and removed sources", async () => {
    const user = await account();
    const zone = "America/New_York",
      period = notificationPeriod(zone);
    expect(
      (
        await user.client
          .from("profiles")
          .update({ time_zone: zone })
          .eq("user_id", user.id)
      ).error,
    ).toBeNull();
    const old = await createTask(user, "Gestern", period.yesterday);
    await createTask(user, "Heute", period.day);
    await createTask(user, "Ohne Datum");
    const completed = await createTask(user, "Erledigt", period.yesterday);
    const removed = await createTask(user, "Entfernt", period.yesterday);
    expect(
      (await mutateTask(user, { p_id: completed, p_operation: "complete" }))
        .error,
    ).toBeNull();
    expect(
      (await mutateTask(user, { p_id: removed, p_operation: "remove" })).error,
    ).toBeNull();
    await notificationGoal(user, period.day, "Heute fällig");
    const reached = await notificationGoal(user, period.yesterday, "Erreicht"),
      milestone = randomUUID();
    expect(
      (
        await user.client.rpc("mutate_goal_milestone", {
          p_operation: "create",
          p_goal_id: reached,
          p_id: milestone,
          p_revision: 0,
          p_title: "Fertig",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await user.client.rpc("mutate_goal_milestone", {
          p_operation: "complete",
          p_goal_id: reached,
          p_id: milestone,
          p_revision: 0,
        })
      ).error,
    ).toBeNull();
    await createLinkBudget(user, "2020-01");
    await reviewExpense(user, "2020-01-01", 50000);
    expect((await synchronize(user)).data).toBe(1);
    expect((await readNotifications(user)).items[0]).toMatchObject({
      task_id: old,
      checked_on: period.day,
      time_zone: zone,
    });
  });
  it("uses financial target balances including deposits and excludes completed financial goals", async () => {
    const user = await account({ skipGoal: true });
    const id = randomUUID(),
      contribution = randomUUID();
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "create",
          p_id: id,
          p_entry_id: randomUUID(),
          p_revision: 0,
          p_payload: {
            name: "Sparziel",
            target: 10000,
            opening: 5000,
            monthly: 0,
            month: "2026-01",
            deadline: "2026-01-01",
          },
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "contribute",
          p_id: id,
          p_revision: 0,
          p_entry_id: contribution,
          p_payload: { amount: 5000, date: "2026-01-01", note: "" },
        })
      ).error,
    ).toBeNull();
    expect((await synchronize(user)).data).toBe(0);
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "cancel",
          p_id: id,
          p_revision: 1,
          p_entry_id: contribution,
          p_payload: {},
        })
      ).error,
    ).toBeNull();
    expect((await synchronize(user)).data).toBe(1);
    expect((await readNotifications(user)).items[0]).toMatchObject({
      kind: "goal",
      goal_id: id,
    });
  });
  it("removes task and budget notifications on hard/soft deletion without resurrecting them", async () => {
    const user = await account(),
      period = notificationPeriod();
    const task = await createTask(user, "Entfernen", period.yesterday),
      budget = await createLinkBudget(user, period.month);
    await reviewExpense(user, period.day, 45000);
    expect((await synchronize(user)).data).toBe(2);
    expect(
      (await mutateTask(user, { p_id: task, p_operation: "remove" })).error,
    ).toBeNull();
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
    expect((await readNotifications(user)).total).toBe(0);
    expect((await synchronize(user)).data).toBe(0);
  });
  it("isolates accounts and rejects direct writes, anonymous, incomplete and malformed requests", async () => {
    const user = await account(),
      other = await account(),
      incomplete = await account({ complete: false });
    await createTask(other, "Fremder Hinweis", "2026-01-01");
    expect((await synchronize(other)).data).toBe(1);
    const foreign = (await readNotifications(other)).items[0]!;
    expect((await readNotifications(user)).total).toBe(0);
    expect((await synchronize(user)).data).toBe(0);
    expect(
      (
        await user.client
          .from("notifications")
          .select("*")
          .eq("user_id", other.id)
      ).data,
    ).toEqual([]);
    expect((await markNotification(user, foreign.id, true)).error?.code).toBe(
      "42501",
    );
    expect(
      (
        await user.client
          .from("notifications")
          .update({ read_at: new Date().toISOString(), user_id: user.id })
          .eq("id", foreign.id)
      ).error,
    ).not.toBeNull();
    expect(
      (await user.client.from("notifications").delete().eq("id", foreign.id))
        .error,
    ).not.toBeNull();
    expect(
      (
        await user.client.from("notifications").insert({
          user_id: user.id,
          kind: "task",
          task_id: foreign.kind === "task" ? foreign.task_id : null,
          context: {},
          time_zone: "UTC",
          checked_on: "2026-10-12",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await publicClient().from("notifications").select("*")).error,
    ).not.toBeNull();
    expect(
      (await publicClient().rpc("synchronize_notifications")).error,
    ).not.toBeNull();
    expect(
      (await publicClient().rpc("read_notifications")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("set_notification_read", {
          p_id: foreign.id,
          p_revision: 0,
          p_read: true,
        })
      ).error,
    ).not.toBeNull();
    expect((await synchronize(incomplete)).error?.code).toBe("42501");
    expect(
      (await incomplete.client.rpc("read_notifications")).error?.code,
    ).toBe("42501");
    expect(
      (await markNotification(incomplete, foreign.id, true)).error?.code,
    ).toBe("42501");
    for (const page of [-1, 1000001])
      expect(
        (await user.client.rpc("read_notifications", { p_page: page })).error
          ?.code,
      ).toBe("22023");
    expect(
      (await user.client.rpc("read_notifications", { p_filter: "bad" })).error
        ?.code,
    ).toBe("22023");
    for (const revision of [-1, 2147483647])
      expect(
        (await markNotification(other, foreign.id, true, revision)).error?.code,
      ).toBe("22023");
    expect((await readNotifications(other)).items[0]).toEqual(foreign);
  });
});
