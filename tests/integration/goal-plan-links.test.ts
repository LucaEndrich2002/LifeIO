import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import {
  createLinkGoal,
  financialLinkGoal,
  createLinkBudget,
  mutateLink,
  type LinkAccount,
} from "../supabase/link-fixtures";
import {
  createPlanTarget,
  removePlanTarget,
  mutatePlanLink,
  planLinkRows,
} from "../supabase/plan-link-fixtures";
import { mutateTask } from "../supabase/task-fixtures";
import { mutateEvent } from "../supabase/calendar-fixtures";
const users: LinkAccount[] = [];
async function account(complete = true) {
  const user = await createPlanFixture({ complete });
  users.push(user);
  return user;
}
afterEach(async () => {
  await Promise.all(users.splice(0).map((user) => removeFixture(user.id)));
});
describe("owned goal-plan links", () => {
  it.each(["task", "event"] as const)(
    "links %s to both goal kinds without modifying endpoints or progress",
    async (kind) => {
      const user = await account(),
        goal = await financialLinkGoal(user),
        personal = await createLinkGoal(user),
        target = await createPlanTarget(user, kind);
      const before = await user.client.rpc("read_money_month", {
          p_month: "2026-09",
        }),
        beforeGoal = await user.client.rpc("read_goal", { p_id: goal });
      const table = kind === "task" ? "tasks" : "calendar_events";
      const original = await user.client
        .from(table)
        .select("*")
        .eq("id", target)
        .single();
      for (const goalId of [goal, personal])
        expect(
          (await mutatePlanLink(user, goalId, kind, target)).error,
        ).toBeNull();
      expect((await planLinkRows(user, goal, kind)).count).toBe(1);
      expect(
        (await user.client.from(table).select("*").eq("id", target).single())
          .data,
      ).toEqual(original.data);
      expect(
        (await user.client.rpc("read_money_month", { p_month: "2026-09" }))
          .data,
      ).toEqual(before.data);
      expect((await user.client.rpc("read_goal", { p_id: goal })).data).toEqual(
        beforeGoal.data,
      );
      const update =
        kind === "task"
          ? await mutateTask(user, {
              p_id: target,
              p_operation: "update",
              p_title: "Neuer Titel",
              p_priority: "high",
            })
          : await mutateEvent(user, {
              p_id: target,
              p_operation: "update",
              p_title: "Neuer Titel",
            });
      expect(update.error).toBeNull();
      if (kind === "task")
        expect(
          (
            await mutateTask(user, {
              p_id: target,
              p_operation: "complete",
              p_revision: 1,
            })
          ).error,
        ).toBeNull();
      const linked =
        kind === "task"
          ? await user.client
              .from("entity_links")
              .select("target:tasks!inner(title,completed_at)")
              .eq("goal_id", goal)
          : await user.client
              .from("entity_links")
              .select("target:calendar_events!inner(title)")
              .eq("goal_id", goal);
      expect(linked.error).toBeNull();
      expect(linked.data?.[0]?.target).toMatchObject({ title: "Neuer Titel" });
      expect((await planLinkRows(user, goal, kind)).count).toBe(1);
    },
  );
  it.each(["task", "event"] as const)(
    "serializes %s duplicates and preserves explicit unlink/relink decisions",
    async (kind) => {
      const user = await account(),
        goal = await createLinkGoal(user),
        target = await createPlanTarget(user, kind),
        id = randomUUID();
      const repeats = await Promise.all([
        mutatePlanLink(user, goal, kind, target, id),
        mutatePlanLink(user, goal, kind, target, id),
      ]);
      expect(repeats.every((r) => !r.error)).toBe(true);
      expect((await mutatePlanLink(user, goal, kind, target)).error?.code).toBe(
        "40001",
      );
      for (let i = 0; i < 2; i++)
        expect(
          (await mutatePlanLink(user, goal, kind, target, id, "remove")).error,
        ).toBeNull();
      expect(
        (await mutatePlanLink(user, goal, kind, target, id)).error?.code,
      ).toBe("40001");
      const competing = await Promise.all([
        mutatePlanLink(user, goal, kind, target),
        mutatePlanLink(user, goal, kind, target),
      ]);
      expect(competing.filter((r) => !r.error)).toHaveLength(1);
      expect(competing.find((r) => r.error)?.error?.code).toBe("40001");
      expect(
        (await mutatePlanLink(user, goal, kind, target, id, "remove")).error,
      ).toBeNull();
      expect((await planLinkRows(user, goal, kind)).count).toBe(1);
      expect(
        (
          await user.client
            .from(kind === "task" ? "tasks" : "calendar_events")
            .select("id")
            .eq("id", target)
        ).data,
      ).toHaveLength(1);
    },
  );
  it("rejects foreign, anonymous, incomplete and malformed operations and cross-kind link IDs", async () => {
    const a = await account(),
      b = await account(),
      unfinished = await account(false),
      goal = await createLinkGoal(a),
      foreignGoal = await createLinkGoal(b),
      budget = await createLinkBudget(a),
      budgetLink = randomUUID();
    expect((await mutateLink(a, goal, budget, budgetLink)).error).toBeNull();
    let previousPlanLink: string | undefined;
    for (const kind of ["task", "event"] as const) {
      const target = await createPlanTarget(a, kind),
        foreign = await createPlanTarget(b, kind),
        id = randomUUID();
      expect(
        (await mutatePlanLink(a, goal, kind, target, id)).error,
      ).toBeNull();
      if (previousPlanLink)
        expect(
          (
            await mutatePlanLink(
              a,
              goal,
              kind,
              target,
              previousPlanLink,
              "remove",
            )
          ).error?.code,
        ).toBe("42501");
      previousPlanLink = id;
      for (const [user, g, t] of [
        [a, goal, foreign],
        [a, foreignGoal, target],
        [b, goal, target],
        [unfinished, goal, target],
        [a, goal, randomUUID()],
        [a, randomUUID(), target],
      ] as const)
        expect((await mutatePlanLink(user, g, kind, t)).error?.code).toBe(
          "42501",
        );
      expect(
        (await b.client.from("entity_links").select("*").eq("id", id)).data,
      ).toEqual([]);
      expect(
        (await mutatePlanLink(b, goal, kind, target, id, "remove")).error?.code,
      ).toBe("42501");
      expect(
        (await mutatePlanLink(a, goal, kind, target, budgetLink, "remove"))
          .error?.code,
      ).toBe("42501");
      expect(
        (await mutateLink(a, goal, budget, id, "remove")).error?.code,
      ).toBe("42501");
      expect((await mutateLink(a, goal, budget, id)).error?.code).toBe("42501");
      expect(
        (
          await mutatePlanLink(
            a,
            goal,
            kind,
            target,
            randomUUID(),
            "delete_goal",
          )
        ).error?.code,
      ).toBe("22023");
      expect(
        (
          await a.client.rpc("mutate_goal_plan_link", {
            p_id: randomUUID(),
            p_goal_id: goal,
            p_target_id: target,
            p_kind: "sql",
            p_operation: "create",
          })
        ).error?.code,
      ).toBe("22023");
      expect(
        (
          await publicClient().rpc("mutate_goal_plan_link", {
            p_id: id,
            p_goal_id: goal,
            p_target_id: target,
            p_kind: kind,
            p_operation: "remove",
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await a.client.from("entity_links").insert({
            id: randomUUID(),
            user_id: b.id,
            goal_id: goal,
            task_id: target,
            relationship: "requires",
          })
        ).error?.code,
      ).toBe("42501");
      expect(
        (
          await a.client
            .from("entity_links")
            .update({ goal_id: foreignGoal })
            .eq("id", id)
        ).error?.code,
      ).toBe("42501");
      expect(
        (await a.client.from("entity_links").delete().eq("id", id)).error?.code,
      ).toBe("42501");
      expect((await planLinkRows(a, goal, kind)).count).toBe(1);
    }
    expect(
      (await publicClient().from("entity_links").select("*")).error,
    ).not.toBeNull();
    expect(
      (await a.client.from("entity_links").select("id").eq("id", budgetLink))
        .data,
    ).toHaveLength(1);
  });
  it.each(["task", "event"] as const)(
    "removes links atomically when a %s is deleted, including competing creation",
    async (kind) => {
      const user = await account(),
        goal = await createLinkGoal(user),
        target = await createPlanTarget(user, kind),
        id = randomUUID();
      expect(
        (await mutatePlanLink(user, goal, kind, target, id)).error,
      ).toBeNull();
      expect((await removePlanTarget(user, kind, target)).error).toBeNull();
      expect((await planLinkRows(user, goal, kind)).count).toBe(0);
      expect(
        (await user.client.from("entity_links").select("id").eq("id", id)).data,
      ).toEqual([]);
      expect((await mutatePlanLink(user, goal, kind, target)).error?.code).toBe(
        "42501",
      );
      const racing = await createPlanTarget(user, kind);
      const results = await Promise.all([
        mutatePlanLink(user, goal, kind, racing),
        removePlanTarget(user, kind, racing),
      ]);
      expect(results[1]?.error).toBeNull();
      if (results[0]?.error) expect(results[0].error.code).toBe("42501");
      expect((await planLinkRows(user, goal, kind)).count).toBe(0);
      expect(
        (await user.client.from("goals").select("id").eq("id", goal)).data,
      ).toHaveLength(1);
    },
  );
  it.each(["task", "event"] as const)(
    "paginates %s links in both directions with exact totals and active endpoints",
    async (kind) => {
      const user = await account(),
        goal = await createLinkGoal(user),
        target = await createPlanTarget(user, kind);
      expect((await mutatePlanLink(user, goal, kind, target)).error).toBeNull();
      for (let i = 0; i < 25; i++) {
        const other = await createPlanTarget(user, kind, `Schritt ${i}`),
          otherGoal = await createLinkGoal(user, `Ziel ${i}`);
        expect(
          (await mutatePlanLink(user, goal, kind, other)).error,
        ).toBeNull();
        expect(
          (await mutatePlanLink(user, otherGoal, kind, target)).error,
        ).toBeNull();
      }
      const first = await planLinkRows(user, goal, kind),
        last = await planLinkRows(user, goal, kind, 1);
      expect(first.count).toBe(26);
      expect(first.data).toHaveLength(25);
      expect(last.count).toBe(26);
      expect(last.data).toHaveLength(1);
      expect(
        new Set([...(first.data ?? []), ...(last.data ?? [])].map((r) => r.id))
          .size,
      ).toBe(26);
      const reverse = await user.client
        .from("entity_links")
        .select("id,goal:goals!inner(name)", { count: "exact" })
        .eq(kind === "task" ? "task_id" : "calendar_event_id", target)
        .order("created_at", { ascending: false })
        .order("id")
        .range(25, 49);
      expect(reverse.error).toBeNull();
      expect(reverse.count).toBe(26);
      expect(reverse.data).toHaveLength(1);
    },
  );
});
