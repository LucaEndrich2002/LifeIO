import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import {
  availableMinor,
  moneySnapshotSchema,
} from "../../src/domain/transactions";
import { budgetStatus } from "../../src/domain/plans";
import type { Json } from "../../src/types/database";

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
const fixedInput = {
  name: "Internet",
  amount: 5000,
  month: "2026-09",
  end_month: "",
};
const budgetInput = { name: "Alltag", amount: 50000, month: "2026-09" };
const fixed = (
  a: Account,
  operation: string,
  id: string,
  payload: Json = fixedInput,
  revision = 0,
  newId: string = randomUUID(),
) =>
  a.client.rpc("mutate_fixed_cost", {
    p_operation: operation,
    p_id: id,
    p_new_id: newId,
    p_revision: revision,
    p_payload: payload,
  });
const budget = (
  a: Account,
  operation: string,
  id: string,
  payload: Json = budgetInput,
  revision = 0,
) =>
  a.client.rpc("mutate_budget", {
    p_operation: operation,
    p_id: id,
    p_revision: revision,
    p_payload: payload,
  });
async function month(a: Account, value = "2026-09", page = 0) {
  const result = await a.client.rpc("read_money_month", {
    p_month: value,
    p_expense_page: page,
  });
  expect(result.error).toBeNull();
  return moneySnapshotSchema.parse(result.data);
}

describe("fixed-cost history and monthly variable-expense budgets", () => {
  it("versions onboarding fixed costs across year boundaries and includes the final month exactly once", async () => {
    const a = await account();
    const id = (await month(a)).fixed[0]!.id;
    const successor = randomUUID();
    const change = {
      ...fixedInput,
      name: "Miete neu",
      amount: 95001,
      month: "2027-01",
      end_month: "2027-03",
    };
    for (let retry = 0; retry < 2; retry++)
      expect(
        (await fixed(a, "change", id, change, 0, successor)).error,
      ).toBeNull();
    expect((await month(a, "2026-08")).totals.fixed).toBe(0);
    expect((await month(a, "2026-12")).totals.fixed).toBe(90000);
    expect((await month(a, "2027-01")).totals.fixed).toBe(95001);
    expect((await month(a, "2027-03")).totals.fixed).toBe(95001);
    expect((await month(a, "2027-04")).totals.fixed).toBe(0);
    expect((await month(a, "2027-01")).fixed).toHaveLength(1);
    expect(
      (await fixed(a, "end", id, { month: "2026-11" }, 1)).error?.code,
    ).toBe("40001");
    expect(
      (await fixed(a, "end", successor, { month: "2027-02" })).error,
    ).toBeNull();
    expect(
      (await fixed(a, "end", successor, { month: "2027-02" })).error,
    ).toBeNull();
    expect((await month(a, "2027-02")).totals.fixed).toBe(95001);
    expect((await month(a, "2027-03")).totals.fixed).toBe(0);
    expect((await month(a, "2026-12")).fixed[0]!.name).toBe("Miete");
  });
  it("creates once despite retries and rejects conflicting concurrent versions", async () => {
    const a = await account({ skipFixed: true });
    const id = randomUUID();
    expect((await month(a)).fixed_known).toBe(false);
    const created = await Promise.all([
      fixed(a, "create", id),
      fixed(a, "create", id),
    ]);
    expect(created.every((r) => !r.error)).toBe(true);
    expect((await month(a)).fixed_known).toBe(true);
    expect((await month(a)).totals.fixed).toBe(5000);
    const results = await Promise.all([
      fixed(a, "change", id, { ...fixedInput, month: "2026-10", amount: 6000 }),
      fixed(a, "change", id, { ...fixedInput, month: "2026-11", amount: 7000 }),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe("40001");
    expect((await month(a)).totals.fixed).toBe(5000);
    expect((await month(a, "2026-12")).fixed).toHaveLength(1);
  });
  it("derives full budget usage across pages, categories, overspending and month moves without an extra deduction", async () => {
    const a = await account();
    const id = randomUUID();
    expect((await budget(a, "create", id)).error).toBeNull();
    expect((await budget(a, "create", id)).error).toBeNull();
    expect((await budget(a, "create", randomUUID())).error?.code).toBe("40001");
    for (let i = 0; i < 30; i++)
      expect(
        (
          await a.client.rpc("mutate_money", {
            p_kind: "expense",
            p_operation: "create",
            p_id: randomUUID(),
            p_revision: 0,
            p_payload: {
              name: "Ausgabe",
              amount: 1500,
              spent_on: "2026-09-30",
              category: i % 2 ? "groceries" : "mobility",
            },
          })
        ).error,
      ).toBeNull();
    const result = await month(a);
    const page2 = await month(a, "2026-09", 1);
    expect(result.budget?.amount_minor).toBe(50000);
    expect(result.totals).toEqual(page2.totals);
    expect(
      budgetStatus(result.budget!.amount_minor, result.totals.variable),
    ).toMatchObject({ percent: "90", remaining: 5000 });
    expect(availableMinor(result.totals)).toBe(95000);
    expect(
      (await budget(a, "update", id, { ...budgetInput, amount: 40000 })).error,
    ).toBeNull();
    expect(
      budgetStatus(
        (await month(a)).budget!.amount_minor,
        result.totals.variable,
      ).remaining,
    ).toBe(-5000);
    const expense = result.expenses[0]!;
    expect(
      (
        await a.client.rpc("mutate_money", {
          p_kind: "expense",
          p_operation: "update",
          p_id: expense.id,
          p_revision: 0,
          p_payload: {
            name: "Ausgabe",
            amount: 1500,
            category: "groceries",
            spent_on: "2026-10-01",
          },
        })
      ).error,
    ).toBeNull();
    expect((await month(a)).totals.variable).toBe(43500);
    expect((await month(a, "2026-10")).budget).toBeNull();
    expect((await month(a, "2026-10")).totals.variable).toBe(1500);
    expect((await budget(a, "delete", id, {}, 1)).error).toBeNull();
    expect((await month(a)).budget).toBeNull();
    expect((await month(a)).totals.variable).toBe(43500);
  });
  it("rejects competing budget updates, stale deletes and moving a budget to another month", async () => {
    const a = await account();
    const id = randomUUID();
    expect((await budget(a, "create", id)).error).toBeNull();
    expect(
      (await budget(a, "update", id, { ...budgetInput, month: "2026-10" }))
        .error,
    ).not.toBeNull();
    const edits = await Promise.all([
      budget(a, "update", id, { ...budgetInput, amount: 10000 }),
      budget(a, "update", id, { ...budgetInput, amount: 20000 }),
    ]);
    expect(edits.filter((r) => !r.error)).toHaveLength(1);
    expect((await budget(a, "delete", id)).error?.code).toBe("40001");
  });
  it("isolates both plans, denies direct writes and rejects foreign successor IDs atomically", async () => {
    const a = await account();
    const b = await account();
    const foreign = (await month(b)).fixed[0]!.id;
    const own = (await month(a)).fixed[0]!.id;
    const bid = randomUUID();
    expect((await budget(b, "create", bid)).error).toBeNull();
    expect(
      (await a.client.from("budgets").select("*").eq("id", bid)).data,
    ).toEqual([]);
    expect(
      (
        await a.client.from("budgets").insert({
          id: randomUUID(),
          user_id: a.id,
          ...{ name: "Injected", amount_minor: 1, month: "2026-09-01" },
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await a.client.from("budgets").update({ user_id: a.id }).eq("id", bid))
        .error,
    ).not.toBeNull();
    expect(
      (await a.client.from("budgets").delete().eq("id", bid)).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from("expenses")
          .update({ end_month: "2026-09-01" })
          .eq("id", own)
      ).error,
    ).not.toBeNull();
    for (const operation of ["create", "update", "delete"])
      expect((await budget(a, operation, bid)).error).not.toBeNull();
    for (const operation of ["create", "change", "end"])
      expect(
        (
          await fixed(a, operation, foreign, {
            ...fixedInput,
            month: "2026-10",
          })
        ).error,
      ).not.toBeNull();
    expect(
      (
        await fixed(
          a,
          "change",
          own,
          { ...fixedInput, month: "2026-10" },
          0,
          foreign,
        )
      ).error,
    ).not.toBeNull();
    expect((await month(a, "2026-10")).totals.fixed).toBe(90000);
    expect(
      (
        await budget(a, "create", randomUUID(), {
          ...budgetInput,
          user_id: b.id,
        })
      ).error,
    ).toBeNull();
    expect((await month(b)).budget?.id).toBe(bid);
    expect(
      (await publicClient().from("budgets").select("*")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_budget", {
          p_operation: "create",
          p_id: randomUUID(),
          p_revision: 0,
          p_payload: budgetInput,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_fixed_cost", {
          p_operation: "create",
          p_id: randomUUID(),
          p_new_id: randomUUID(),
          p_revision: 0,
          p_payload: fixedInput,
        })
      ).error,
    ).not.toBeNull();
  });
  it("validates direct inputs, onboarding gates and inclusive supported month boundaries", async () => {
    const incomplete = await account({ complete: false });
    expect(
      (await fixed(incomplete, "create", randomUUID())).error,
    ).not.toBeNull();
    expect(
      (await budget(incomplete, "create", randomUUID())).error,
    ).not.toBeNull();
    const a = await account();
    for (const change of [
      { amount: 0 },
      { amount: -1 },
      { amount: 1.1 },
      { amount: 100000000000 },
      { name: " " },
      { month: "2026-13" },
      { month: "1999-12" },
      { month: "2101-01" },
    ]) {
      expect(
        (await fixed(a, "create", randomUUID(), { ...fixedInput, ...change }))
          .error,
      ).not.toBeNull();
      expect(
        (await budget(a, "create", randomUUID(), { ...budgetInput, ...change }))
          .error,
      ).not.toBeNull();
    }
    expect(
      (
        await fixed(a, "create", randomUUID(), {
          ...fixedInput,
          end_month: "2026-08",
        })
      ).error,
    ).not.toBeNull();
    const original = (await month(a)).fixed[0]!.id;
    expect(
      (await fixed(a, "change", original, fixedInput)).error,
    ).not.toBeNull();
    expect(
      (await fixed(a, "end", original, { month: "2026-08" })).error,
    ).not.toBeNull();
    const id = randomUUID();
    expect(
      (
        await fixed(a, "create", id, {
          ...fixedInput,
          month: "2100-12",
          end_month: "2100-12",
        })
      ).error,
    ).toBeNull();
    expect((await month(a, "2100-12")).totals.fixed).toBe(95000);
    expect((await month(a, "2100-11")).totals.fixed).toBe(90000);
  });
});
