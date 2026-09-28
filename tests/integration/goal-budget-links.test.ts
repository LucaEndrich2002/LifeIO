import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import {
  createLinkBudget,
  createLinkGoal,
  financialLinkGoal,
  mutateLink,
  type LinkAccount,
} from "../supabase/link-fixtures";
import {
  goalBudgetPageSchema,
  budgetGoalPageSchema,
} from "../../src/domain/goal-budget-links";
const users: LinkAccount[] = [];
async function account(complete = true) {
  const a = await createPlanFixture({ complete });
  users.push(a);
  return a;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
const links = (a: LinkAccount) => a.client.from("entity_links").select("*");

describe("owned goal-budget links", () => {
  it("links both goal kinds without changing endpoints or any financial totals", async () => {
    const a = await account();
    const goal = await financialLinkGoal(a);
    const personal = await createLinkGoal(a);
    const budget = await createLinkBudget(a);
    const id = randomUUID();
    const beforeGoal = await a.client.rpc("read_goal", { p_id: goal });
    const beforeMonth = await a.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    const beforeBudget = await a.client
      .from("budgets")
      .select("*")
      .eq("id", budget)
      .single();
    expect(beforeGoal.error).toBeNull();
    expect(beforeMonth.error).toBeNull();
    expect(beforeBudget.error).toBeNull();
    expect((await mutateLink(a, goal, budget, id)).error).toBeNull();
    expect((await mutateLink(a, goal, budget, id)).error).toBeNull();
    expect((await mutateLink(a, personal, budget)).error).toBeNull();
    expect((await links(a)).data).toHaveLength(2);
    expect((await a.client.rpc("read_goal", { p_id: goal })).data).toEqual(
      beforeGoal.data,
    );
    expect(
      (await a.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(beforeMonth.data);
    expect(
      (await a.client.from("budgets").select("*").eq("id", budget).single())
        .data,
    ).toEqual(beforeBudget.data);
  });
  it("serializes duplicate requests and rejects competing duplicate pairs", async () => {
    const a = await account();
    const goal = await financialLinkGoal(a);
    const budget = await createLinkBudget(a);
    const id = randomUUID();
    expect(
      (
        await Promise.all([
          mutateLink(a, goal, budget, id),
          mutateLink(a, goal, budget, id),
        ])
      ).every((r) => !r.error),
    ).toBe(true);
    expect((await mutateLink(a, goal, budget)).error?.code).toBe("40001");
    const other = await createLinkGoal(a);
    const competing = await Promise.all([
      mutateLink(a, other, budget),
      mutateLink(a, other, budget),
    ]);
    expect(competing.filter((r) => !r.error)).toHaveLength(1);
    expect(competing.find((r) => r.error)?.error?.code).toBe("40001");
    expect((await mutateLink(a, other, budget, id, "remove")).error?.code).toBe(
      "42501",
    );
    expect((await links(a)).data).toHaveLength(2);
  });
  it("unlinks without deleting endpoints and prevents old requests from undoing a later relink", async () => {
    const a = await account();
    const goal = await financialLinkGoal(a);
    const budget = await createLinkBudget(a);
    const id = randomUUID();
    expect((await mutateLink(a, goal, budget, id)).error).toBeNull();
    expect((await mutateLink(a, goal, budget, id, "remove")).error).toBeNull();
    expect((await mutateLink(a, goal, budget, id, "remove")).error).toBeNull();
    expect((await links(a)).data).toEqual([]);
    expect((await mutateLink(a, goal, budget, id)).error?.code).toBe("40001");
    const replacement = randomUUID();
    expect((await mutateLink(a, goal, budget, replacement)).error).toBeNull();
    expect((await mutateLink(a, goal, budget, id, "remove")).error).toBeNull();
    expect((await links(a)).data?.map((row) => row.id)).toEqual([replacement]);
    expect(
      (await a.client.from("goals").select("id").eq("id", goal).single()).error,
    ).toBeNull();
    expect(
      (await a.client.from("budgets").select("id").eq("id", budget).single())
        .error,
    ).toBeNull();
  });
  it("blocks foreign endpoints, forged owners, direct and anonymous writes, and invalid operations", async () => {
    const a = await account();
    const b = await account();
    const unfinished = await account(false);
    const goal = await financialLinkGoal(a);
    const foreignGoal = await financialLinkGoal(b);
    const budget = await createLinkBudget(a);
    const foreignBudget = await createLinkBudget(b);
    const id = randomUUID();
    expect((await mutateLink(a, goal, budget, id)).error).toBeNull();
    expect((await links(b)).data).toEqual([]);
    for (const [g, bd] of [
      [goal, foreignBudget],
      [foreignGoal, budget],
      [foreignGoal, foreignBudget],
    ])
      expect((await mutateLink(a, g!, bd!)).error?.code).toBe("42501");
    expect(
      (await mutateLink(b, foreignGoal, foreignBudget, id, "remove")).error
        ?.code,
    ).toBe("42501");
    expect(
      (
        await a.client.from("entity_links").insert({
          id: randomUUID(),
          user_id: b.id,
          goal_id: goal,
          budget_id: budget,
          relationship: "requires",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await a.client
          .from("entity_links")
          .update({ user_id: b.id, budget_id: foreignBudget })
          .eq("id", id)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await a.client.from("entity_links").delete().eq("id", id)).error?.code,
    ).toBe("42501");
    expect(
      (await publicClient().from("entity_links").select("*")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_goal_budget_link", {
          p_operation: "create",
          p_id: randomUUID(),
          p_goal_id: goal,
          p_budget_id: budget,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await mutateLink(a, goal, budget, randomUUID(), "update")).error?.code,
    ).toBe("22023");
    expect((await mutateLink(unfinished, goal, budget)).error?.code).toBe(
      "42501",
    );
    expect((await links(a)).data).toHaveLength(1);
  });
  it("cascades link cleanup when deleting a budget, even when link creation races with deletion", async () => {
    const a = await account();
    const goal = await financialLinkGoal(a);
    const budget = await createLinkBudget(a);
    const id = randomUUID();
    expect((await mutateLink(a, goal, budget, id)).error).toBeNull();
    const other = await createLinkGoal(a);
    const results = await Promise.all([
      mutateLink(a, other, budget),
      a.client.rpc("mutate_budget", {
        p_operation: "delete",
        p_id: budget,
        p_revision: 0,
        p_payload: {},
      }),
    ]);
    expect(results[1]!.error).toBeNull();
    if (results[0]!.error) expect(results[0]!.error.code).toBe("42501");
    expect((await links(a)).data).toEqual([]);
    expect(
      (await a.client.from("goals").select("id").eq("id", goal).single()).error,
    ).toBeNull();
    expect((await mutateLink(a, goal, budget, id)).error?.code).toBe("42501");
  });
  it("reads current endpoint labels and paginates both directions with complete counts", async () => {
    const a = await account();
    const goal = await financialLinkGoal(a);
    const budget = await createLinkBudget(a);
    const ids: string[] = [];
    for (let i = 0; i < 26; i++) {
      const personal = await createLinkGoal(a, `Ziel ${i + 1}`);
      const id = randomUUID();
      ids.push(id);
      expect((await mutateLink(a, personal, budget, id)).error).toBeNull();
    }
    const reverse = await a.client
      .from("entity_links")
      .select("id,goal:goals!inner(id,name,kind)", { count: "exact" })
      .eq("budget_id", budget)
      .order("created_at", { ascending: false })
      .order("id")
      .range(25, 49);
    expect(reverse.error).toBeNull();
    const parsed = budgetGoalPageSchema.parse({
      items: reverse.data,
      count: reverse.count,
    });
    expect(parsed.count).toBe(26);
    expect(parsed.items.map((row) => row.id)).toEqual([ids[0]]);
    const outgoing: string[] = [];
    for (let i = 0; i < 26; i++) {
      const month = `${2027 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
      const bd = await createLinkBudget(a, month);
      const id = randomUUID();
      outgoing.push(id);
      expect((await mutateLink(a, goal, bd, id)).error).toBeNull();
    }
    const page = await a.client
      .from("entity_links")
      .select("id,budget:budgets!inner(id,name,month,amount_minor,currency)", {
        count: "exact",
      })
      .eq("goal_id", goal)
      .order("created_at", { ascending: false })
      .order("id")
      .range(25, 49);
    expect(page.error).toBeNull();
    const result = goalBudgetPageSchema.parse({
      items: page.data,
      count: page.count,
    });
    expect(result.count).toBe(26);
    expect(result.items.map((row) => row.id)).toEqual([outgoing[0]]);
    const renamed = result.items[0]!.budget.id;
    expect(
      (
        await a.client.rpc("mutate_budget", {
          p_operation: "update",
          p_id: renamed,
          p_revision: 0,
          p_payload: { name: "Neuer Name", amount: 60000, month: "2027-01" },
        })
      ).error,
    ).toBeNull();
    const current = await a.client
      .from("entity_links")
      .select("budget:budgets!inner(name,amount_minor)")
      .eq("id", outgoing[0]!)
      .single();
    expect(current.data?.budget).toEqual({
      name: "Neuer Name",
      amount_minor: 60000,
    });
  });
});
