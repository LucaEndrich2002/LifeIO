import { afterEach, describe, expect, it } from "vitest";
import {
  createFixture,
  publicClient,
  removeFixture,
} from "../supabase/fixtures";
import type { Json } from "../../src/types/database";

const fixtures: Awaited<ReturnType<typeof createFixture>>[] = [];
async function account() {
  const user = await createFixture();
  fixtures.push(user);
  expect(
    (
      await user.client.from("profiles").insert({
        user_id: user.id,
        display_name: "Onboarding fixture",
        time_zone: "Europe/Berlin",
        currency: "EUR",
      })
    ).error,
  ).toBeNull();
  return user;
}
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) await removeFixture(fixture.id);
});
const income = {
  decision: "saved",
  month: "2026-09",
  name: "Net income",
  amount: 280000,
};
const expenses = {
  decision: "saved",
  items: [
    { name: "Rent", amount: 90000 },
    { name: "Internet", amount: 3999 },
  ],
};
const goal = {
  decision: "saved",
  name: "Reserve",
  target: 1000000,
  current: 350000,
  monthly: 50000,
};
type Account = Awaited<ReturnType<typeof account>>;
const save = (user: Account, step: string, payload: Json, revision: number) =>
  user.client.rpc("save_onboarding_step", {
    p_step: step,
    p_payload: payload,
    p_revision: revision,
  });

describe("financial onboarding through authenticated Data API", () => {
  it("persists exact amounts once, updates draft months and resumes with explicit status", async () => {
    const user = await account();
    expect((await save(user, "income", income, 0)).error).toBeNull();
    const first = (await user.client.from("incomes").select("*").single())
      .data!;
    expect(first.amount_minor).toBe(280000);
    expect((await save(user, "expenses", expenses, 1)).error).toBeNull();
    expect(
      (
        await save(
          user,
          "income",
          { ...income, month: "2027-01", amount: 280001 },
          2,
        )
      ).error,
    ).toBeNull();
    const updated = (await user.client.from("incomes").select("*")).data!;
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      id: first.id,
      amount_minor: 280001,
      month: "2027-01-01",
    });
    expect(
      (await user.client.from("expenses").select("start_month")).data,
    ).toEqual([{ start_month: "2027-01-01" }, { start_month: "2027-01-01" }]);
    expect((await save(user, "expenses", expenses, 3)).error).toBeNull();
    expect((await user.client.from("expenses").select("id")).data).toHaveLength(
      2,
    );
    expect((await save(user, "goal", goal, 4)).error).toBeNull();
    expect(
      (
        await user.client
          .from("goals")
          .select("target_minor,current_minor,monthly_minor")
          .single()
      ).data,
    ).toEqual({
      target_minor: 1000000,
      current_minor: 350000,
      monthly_minor: 50000,
    });
    expect(
      (await user.client.from("onboarding").select("*").single()).data,
    ).toMatchObject({
      revision: 5,
      income_status: "saved",
      expenses_status: "saved",
      goal_status: "saved",
      completed_at: null,
    });
  });
  it("requires every decision before completion and seals the initial records atomically", async () => {
    const user = await account();
    expect((await save(user, "complete", {}, 0)).error).not.toBeNull();
    expect((await user.client.from("onboarding").select("*")).data).toEqual([]);
    expect((await save(user, "goal", goal, 0)).error).not.toBeNull();
    expect(
      (await save(user, "income", { decision: "skipped", month: "2026-09" }, 0))
        .error,
    ).toBeNull();
    expect(
      (await save(user, "expenses", { decision: "skipped" }, 1)).error,
    ).toBeNull();
    expect(
      (await save(user, "goal", { decision: "skipped" }, 2)).error,
    ).toBeNull();
    expect((await save(user, "complete", {}, 3)).error).not.toBeNull();
    expect(
      (await save(user, "tasks", { decision: "skipped" }, 3)).error,
    ).toBeNull();
    expect((await save(user, "complete", {}, 4)).error).toBeNull();
    const completed = (
      await user.client.from("onboarding").select("*").single()
    ).data!;
    expect(completed.completed_at).not.toBeNull();
    expect((await save(user, "complete", {}, 3)).error).toBeNull();
    expect((await save(user, "income", income, 4)).error).not.toBeNull();
    expect(
      (await user.client.from("onboarding").select("*").single()).data,
    ).toEqual(completed);
    for (const table of ["incomes", "expenses", "goals"] as const)
      expect((await user.client.from(table).select("*")).data).toEqual([]);
  });
  it("isolates every financial table and prevents direct writes, forged owners and completion", async () => {
    const a = await account();
    const b = await account();
    for (const user of [a, b]) {
      expect((await save(user, "income", income, 0)).error).toBeNull();
      expect((await save(user, "expenses", expenses, 1)).error).toBeNull();
      expect((await save(user, "goal", goal, 2)).error).toBeNull();
    }
    for (const table of [
      "incomes",
      "expenses",
      "goals",
      "onboarding",
    ] as const) {
      const foreign = (await b.client.from(table).select("*")).data!;
      expect(foreign.length).toBeGreaterThan(0);
      expect(
        (await a.client.from(table).select("*").eq("user_id", b.id)).data,
      ).toEqual([]);
      if (table !== "onboarding")
        expect(
          (
            await a.client
              .from(table)
              .select("*")
              .eq("id", (foreign[0] as { id: string }).id)
          ).data,
        ).toEqual([]);
      expect(
        (await publicClient().from(table).select("*")).error,
      ).not.toBeNull();
      expect(
        (
          await a.client
            .from(table)
            .update({ user_id: b.id })
            .eq("user_id", a.id)
        ).error,
      ).not.toBeNull();
      expect(
        (await a.client.from(table).delete().eq("user_id", b.id)).error,
      ).not.toBeNull();
      expect((await b.client.from(table).select("*")).data).toEqual(foreign);
    }
    expect(
      (
        await a.client
          .from("onboarding")
          .update({ completed_at: new Date().toISOString() })
          .eq("user_id", a.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client.from("incomes").insert({
          user_id: a.id,
          name: "Bypass",
          amount_minor: 1,
          month: "2026-09-01",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await save(
          a,
          "income",
          {
            ...income,
            user_id: b.id,
            id: "00000000-0000-0000-0000-000000000001",
            amount: 123,
          },
          3,
        )
      ).error,
    ).toBeNull();
    expect(
      (await b.client.from("incomes").select("amount_minor").single()).data
        ?.amount_minor,
    ).toBe(280000);
    expect(
      (await a.client.from("incomes").select("amount_minor").single()).data
        ?.amount_minor,
    ).toBe(123);
    expect(
      (
        await publicClient().rpc("save_onboarding_step", {
          p_step: "income",
          p_payload: income,
          p_revision: 0,
        })
      ).error,
    ).not.toBeNull();
  });
  it("rejects malformed direct inputs and rolls back every row on partial failure", async () => {
    const user = await account();
    for (const payload of [
      { ...income, amount: 0 },
      { ...income, amount: -1 },
      { ...income, amount: 1.5 },
      { ...income, amount: "10" },
      { ...income, amount: 100000000000 },
      { ...income, name: " " },
      { ...income, name: "x".repeat(81) },
      { ...income, name: 23 },
      { ...income, month: "2026-13" },
    ])
      expect((await save(user, "income", payload, 0)).error).not.toBeNull();
    expect((await user.client.from("onboarding").select("*")).data).toEqual([]);
    expect((await save(user, "income", income, 0)).error).toBeNull();
    expect((await save(user, "expenses", expenses, 1)).error).toBeNull();
    const before = (
      await user.client.from("expenses").select("*").order("onboarding_slot")
    ).data;
    expect(
      (
        await save(
          user,
          "expenses",
          {
            decision: "saved",
            items: [
              { name: "Changed first", amount: 1 },
              { name: "Invalid second", amount: -1 },
            ],
          },
          2,
        )
      ).error,
    ).not.toBeNull();
    expect(
      (await user.client.from("expenses").select("*").order("onboarding_slot"))
        .data,
    ).toEqual(before);
    expect(
      (await save(user, "expenses", { decision: "saved", items: [] }, 2)).error,
    ).not.toBeNull();
    expect(
      (
        await save(
          user,
          "expenses",
          {
            decision: "saved",
            items: Array.from({ length: 21 }, () => ({
              name: "Cost",
              amount: 1,
            })),
          },
          2,
        )
      ).error,
    ).not.toBeNull();
    expect(
      (await save(user, "goal", { ...goal, current: -1 }, 2)).error,
    ).not.toBeNull();
    expect(
      (
        await save(
          user,
          "goal",
          { ...goal, target: 99999999999, current: 99999999999, monthly: 0 },
          2,
        )
      ).error,
    ).toBeNull();
  });
  it("serializes competing saves and rejects stale revisions without losing data", async () => {
    const user = await account();
    const results = await Promise.all([
      save(user, "income", income, 0),
      save(user, "income", { ...income, amount: 123 }, 0),
    ]);
    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(results.find((result) => result.error)?.error?.code).toBe("40001");
    expect((await user.client.from("incomes").select("*")).data).toHaveLength(
      1,
    );
    expect(
      (await user.client.from("onboarding").select("revision").single()).data
        ?.revision,
    ).toBe(1);
  });
  it("removes previous draft data only on an explicit skip and requires a profile", async () => {
    const user = await account();
    expect((await save(user, "income", income, 0)).error).toBeNull();
    expect((await save(user, "expenses", expenses, 1)).error).toBeNull();
    expect((await save(user, "goal", goal, 2)).error).toBeNull();
    expect(
      (await save(user, "income", { decision: "skipped", month: "2026-09" }, 3))
        .error,
    ).toBeNull();
    expect(
      (await save(user, "expenses", { decision: "skipped" }, 4)).error,
    ).toBeNull();
    expect(
      (await save(user, "goal", { decision: "skipped" }, 5)).error,
    ).toBeNull();
    for (const table of ["incomes", "expenses", "goals"] as const)
      expect((await user.client.from(table).select("*")).data).toEqual([]);
    const unconfigured = await createFixture();
    fixtures.push(unconfigured);
    expect(
      (await save(unconfigured, "income", income, 0)).error,
    ).not.toBeNull();
  });
});
