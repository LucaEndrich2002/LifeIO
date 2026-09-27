import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { milestoneSnapshotSchema } from "../../src/domain/milestones";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";

type Account = Awaited<ReturnType<typeof createPlanFixture>>;
const users: Account[] = [];
async function account(complete = true) {
  const user = await createPlanFixture({ complete });
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
async function goalId(a: Account) {
  const r = await a.client.from("goals").select("id").single();
  expect(r.error).toBeNull();
  return r.data!.id;
}
const mutate = (
  a: Account,
  goal: string,
  id: string,
  operation = "create",
  revision = 0,
  title = "Angebote vergleichen",
) =>
  a.client.rpc("mutate_goal_milestone", {
    p_goal_id: goal,
    p_id: id,
    p_operation: operation,
    p_revision: revision,
    p_title: title,
  });
async function read(a: Account, goal: string, page = 0) {
  const r = await a.client.rpc("read_goal_milestones", {
    p_goal_id: goal,
    p_page: page,
  });
  expect(r.error).toBeNull();
  return milestoneSnapshotSchema.parse(r.data);
}

describe("private goal milestones", () => {
  it("creates, renames, completes and reopens without changing finances or duplicating requests", async () => {
    const a = await account();
    const goal = await goalId(a);
    const id = randomUUID();
    const financialBefore = await a.client.rpc("read_goal", { p_id: goal });
    const monthBefore = await a.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    expect((await read(a, goal)).total).toBe(0);
    const duplicates = await Promise.all([
      mutate(a, goal, id),
      mutate(a, goal, id),
    ]);
    expect(duplicates.every((r) => !r.error)).toBe(true);
    expect((await read(a, goal)).total).toBe(1);
    expect((await mutate(a, goal, id, "complete")).error).toBeNull();
    const completed = await read(a, goal);
    expect(completed.completed).toBe(1);
    expect((await mutate(a, goal, id, "complete")).error).toBeNull();
    expect(await read(a, goal)).toEqual(completed);
    expect(
      (await mutate(a, goal, id, "rename", 1, "  Entscheidung treffen  "))
        .error,
    ).toBeNull();
    expect((await mutate(a, goal, id, "reopen", 2)).error).toBeNull();
    expect((await mutate(a, goal, id, "reopen", 2)).error).toBeNull();
    expect((await read(a, goal)).items[0]).toMatchObject({
      title: "Entscheidung treffen",
      completed_at: null,
      revision: 3,
    });
    expect((await read(a, goal)).completed).toBe(0);
    expect((await a.client.rpc("read_goal", { p_id: goal })).data).toEqual(
      financialBefore.data,
    );
    expect(
      (await a.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(monthBefore.data);
  });
  it("counts the entire goal across deterministic pages", async () => {
    const a = await account();
    const goal = await goalId(a);
    const ids: string[] = [];
    for (let i = 0; i < 28; i++) {
      const id = randomUUID();
      ids.push(id);
      expect(
        (await mutate(a, goal, id, "create", 0, `Schritt ${i + 1}`)).error,
      ).toBeNull();
      if (i % 2 === 0)
        expect((await mutate(a, goal, id, "complete")).error).toBeNull();
    }
    const first = await read(a, goal);
    const second = await read(a, goal, 1);
    expect(first).toMatchObject({ total: 28, completed: 14 });
    expect(second).toMatchObject({ total: 28, completed: 14 });
    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(3);
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(
      ids.reverse(),
    );
    expect((await read(a, goal, 2)).items).toEqual([]);
  });
  it("isolates users and goal IDs and rejects anonymous and direct writes", async () => {
    const a = await account();
    const b = await account();
    const ga = await goalId(a);
    const gb = await goalId(b);
    const id = randomUUID();
    expect((await mutate(a, ga, id)).error).toBeNull();
    expect(
      (await b.client.rpc("read_goal_milestones", { p_goal_id: ga })).data,
    ).toBeNull();
    expect(
      (await b.client.from("goal_milestones").select("id").eq("id", id)).data,
    ).toEqual([]);
    for (const operation of [
      "create",
      "rename",
      "complete",
      "reopen",
      "remove",
    ]) {
      expect((await mutate(b, ga, id, operation)).error).not.toBeNull();
      expect((await mutate(b, gb, id, operation)).error).not.toBeNull();
    }
    const other = randomUUID();
    expect(
      (
        await a.client.rpc("mutate_goal", {
          p_operation: "create",
          p_id: other,
          p_entry_id: randomUUID(),
          p_revision: 0,
          p_payload: {
            name: "Zweites Ziel",
            target: 10000,
            opening: 0,
            monthly: 0,
            month: "2026-09",
            deadline: "",
          },
        })
      ).error,
    ).toBeNull();
    expect((await mutate(a, other, id, "complete")).error).not.toBeNull();
    expect(
      (
        await a.client.from("goal_milestones").insert({
          id: randomUUID(),
          user_id: a.id,
          goal_id: ga,
          title: "Direkt",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from("goal_milestones")
          .update({ title: "Direkt" })
          .eq("id", id)
      ).error,
    ).not.toBeNull();
    expect(
      (await a.client.from("goal_milestones").delete().eq("id", id)).error,
    ).not.toBeNull();
    const anon = publicClient();
    expect(
      (await anon.rpc("read_goal_milestones", { p_goal_id: ga })).error,
    ).not.toBeNull();
    expect(
      (
        await anon.rpc("mutate_goal_milestone", {
          p_goal_id: ga,
          p_id: id,
          p_operation: "remove",
          p_revision: 0,
        })
      ).error,
    ).not.toBeNull();
    expect((await read(a, ga)).items[0]?.title).toBe("Angebote vergleichen");
  });
  it("rejects competing stale writes without discarding the winning change", async () => {
    const a = await account();
    const goal = await goalId(a);
    const id = randomUUID();
    expect((await mutate(a, goal, id)).error).toBeNull();
    const results = await Promise.all([
      mutate(a, goal, id, "rename", 0, "Neuer Name"),
      mutate(a, goal, id, "complete"),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe("40001");
    expect((await mutate(a, goal, id, "remove", 0)).error?.code).toBe("40001");
    expect((await read(a, goal)).items[0]?.revision).toBe(1);
  });
  it("removes a milestone from every count and blocks resurrection by an old create request", async () => {
    const a = await account();
    const goal = await goalId(a);
    const id = randomUUID();
    expect((await mutate(a, goal, id)).error).toBeNull();
    expect((await mutate(a, goal, id, "complete")).error).toBeNull();
    expect((await mutate(a, goal, id, "remove", 1)).error).toBeNull();
    expect((await mutate(a, goal, id, "remove", 1)).error).toBeNull();
    expect(await read(a, goal)).toEqual({ items: [], total: 0, completed: 0 });
    expect(
      (await a.client.from("goal_milestones").select("id").eq("id", id)).data,
    ).toEqual([]);
    expect((await mutate(a, goal, id)).error?.code).toBe("40001");
    expect((await mutate(a, goal, id, "reopen", 2)).error).not.toBeNull();
  });
  it("validates titles, pages, revisions and completed setup server-side", async () => {
    const a = await account();
    const goal = await goalId(a);
    const id = randomUUID();
    for (const title of [
      "",
      "   ",
      "\t\r\n",
      "\u00a0\ufeff",
      "a".repeat(81),
      "🌱".repeat(81),
    ])
      expect((await mutate(a, goal, id, "create", 0, title)).error?.code).toBe(
        "22023",
      );
    expect((await mutate(a, goal, id, "create", 1)).error?.code).toBe("22023");
    expect((await mutate(a, goal, id, "toggle")).error?.code).toBe("22023");
    expect((await mutate(a, goal, id, "create", -1)).error?.code).toBe("22023");
    expect(
      (
        await a.client.rpc("read_goal_milestones", {
          p_goal_id: goal,
          p_page: -1,
        })
      ).error?.code,
    ).toBe("22023");
    expect((await mutate(a, randomUUID(), id)).error?.code).toBe("42501");
    const unfinished = await account(false);
    expect((await mutate(unfinished, goal, id)).error?.code).toBe("42501");
    expect((await read(a, goal)).total).toBe(0);
    expect(
      (await mutate(a, goal, id, "create", 0, `\u00a0${"🌱".repeat(80)}\ufeff`))
        .error,
    ).toBeNull();
    expect((await read(a, goal)).items[0]?.title).toBe("🌱".repeat(80));
  });
});
