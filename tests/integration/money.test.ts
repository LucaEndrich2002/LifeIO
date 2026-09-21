import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFixture,
  publicClient,
  removeFixture,
} from "../supabase/fixtures";
import type { Json } from "../../src/types/database";
import {
  moneySnapshotSchema,
  availableMinor,
} from "../../src/domain/transactions";

const users: Awaited<ReturnType<typeof createFixture>>[] = [];
async function account(complete = true) {
  const user = await createFixture();
  users.push(user);
  expect(
    (
      await user.client.from("profiles").insert({
        user_id: user.id,
        display_name: "Money fixture",
        time_zone: "Europe/Berlin",
      })
    ).error,
  ).toBeNull();
  if (complete) {
    const steps: [string, Json][] = [
      [
        "income",
        { decision: "saved", name: "Salary", amount: 280000, month: "2026-09" },
      ],
      [
        "expenses",
        { decision: "saved", items: [{ name: "Rent", amount: 90000 }] },
      ],
      [
        "goal",
        {
          decision: "saved",
          name: "Reserve",
          target: 1000000,
          current: 350000,
          monthly: 50000,
        },
      ],
      ["complete", {}],
    ];
    for (const [revision, [step, payload]] of steps.entries())
      expect(
        (
          await user.client.rpc("save_onboarding_step", {
            p_step: step,
            p_payload: payload,
            p_revision: revision,
          })
        ).error,
      ).toBeNull();
  }
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
type Account = Awaited<ReturnType<typeof account>>;
const income = { name: "Side income", amount: 20000, month: "2026-09" };
const expense = {
  name: "Groceries",
  amount: 45000,
  spent_on: "2026-09-30",
  category: "groceries",
};
const mutate = (
  user: Account,
  kind: string,
  operation: string,
  id: string,
  payload: Json = {},
  revision = 0,
) =>
  user.client.rpc("mutate_money", {
    p_kind: kind,
    p_operation: operation,
    p_id: id,
    p_payload: payload,
    p_revision: revision,
  });
async function snapshot(user: Account, month = "2026-09", page = 0) {
  const result = await user.client.rpc("read_money_month", {
    p_month: month,
    p_expense_page: page,
  });
  expect(result.error).toBeNull();
  return moneySnapshotSchema.parse(result.data);
}
describe("Money ledger mutations and complete monthly snapshots", () => {
  it("adds, edits and removes income and expenses without double-counting fixed costs or savings", async () => {
    const user = await account();
    const incomeId = randomUUID();
    const expenseId = randomUUID();
    expect(
      (await mutate(user, "income", "create", incomeId, income)).error,
    ).toBeNull();
    expect(
      (await mutate(user, "expense", "create", expenseId, expense)).error,
    ).toBeNull();
    expect((await snapshot(user)).totals).toEqual({
      income: 300000,
      variable: 45000,
      fixed: 90000,
      savings: 50000,
      income_count: 2,
      expense_count: 1,
    });
    expect(
      (
        await mutate(user, "income", "update", incomeId, {
          ...income,
          amount: 25000,
        })
      ).error,
    ).toBeNull();
    expect(availableMinor((await snapshot(user)).totals)).toBe(120000);
    expect(
      (
        await mutate(user, "expense", "update", expenseId, {
          ...expense,
          amount: 500000,
        })
      ).error,
    ).toBeNull();
    expect(availableMinor((await snapshot(user)).totals)).toBe(-335000);
    expect(
      (await mutate(user, "expense", "delete", expenseId, {}, 1)).error,
    ).toBeNull();
    expect(
      (await mutate(user, "income", "delete", incomeId, {}, 1)).error,
    ).toBeNull();
    expect((await snapshot(user)).totals.variable).toBe(0);
    expect((await snapshot(user)).totals.income).toBe(280000);
    // The original onboarding income is the same editable row, not a shadow copy.
    const original = (await snapshot(user)).incomes[0]!;
    expect(
      (
        await mutate(user, "income", "update", original.id, {
          ...income,
          amount: 12345,
        })
      ).error,
    ).toBeNull();
    expect((await snapshot(user)).totals.income).toBe(12345);
  });
  it("moves records across months and never generates recurring duplicates", async () => {
    const user = await account();
    const id = randomUUID();
    const incomeId = randomUUID();
    expect(
      (await mutate(user, "expense", "create", id, expense)).error,
    ).toBeNull();
    expect(
      (
        await mutate(user, "expense", "update", id, {
          ...expense,
          spent_on: "2026-10-01",
        })
      ).error,
    ).toBeNull();
    expect((await snapshot(user)).totals.variable).toBe(0);
    expect((await snapshot(user, "2026-10")).totals.variable).toBe(45000);
    expect(
      (await mutate(user, "income", "create", incomeId, income)).error,
    ).toBeNull();
    expect(
      (
        await mutate(user, "income", "update", incomeId, {
          ...income,
          month: "2027-01",
        })
      ).error,
    ).toBeNull();
    expect((await snapshot(user)).totals.income).toBe(280000);
    expect((await snapshot(user, "2027-01")).totals.income).toBe(20000);
    expect((await snapshot(user, "2026-08")).totals).toMatchObject({
      fixed: 0,
      savings: 0,
      income: 0,
    });
    const a = await snapshot(user, "2027-01");
    const b = await snapshot(user, "2027-01");
    expect(a).toEqual(b);
    expect(a.fixed).toHaveLength(1);
  });
  it("makes duplicate creates idempotent and rejects competing updates or stale deletes", async () => {
    const user = await account();
    const id = randomUUID();
    const created = await Promise.all([
      mutate(user, "expense", "create", id, expense),
      mutate(user, "expense", "create", id, expense),
    ]);
    expect(created.every((result) => !result.error)).toBe(true);
    expect((await snapshot(user)).totals.expense_count).toBe(1);
    const edits = await Promise.all([
      mutate(user, "expense", "update", id, { ...expense, amount: 123 }),
      mutate(user, "expense", "update", id, { ...expense, amount: 456 }),
    ]);
    expect(edits.filter((result) => !result.error)).toHaveLength(1);
    expect(edits.find((result) => result.error)?.error?.code).toBe("40001");
    expect((await mutate(user, "expense", "delete", id)).error?.code).toBe(
      "40001",
    );
    expect(
      (await mutate(user, "expense", "create", id, expense)).error,
    ).not.toBeNull();
  });
  it("totals every row beyond the first page with deterministic disjoint lists", async () => {
    const user = await account();
    for (let index = 0; index < 28; index++)
      expect(
        (
          await mutate(user, "expense", "create", randomUUID(), {
            ...expense,
            amount: 101,
          })
        ).error,
      ).toBeNull();
    const first = await snapshot(user);
    const second = await snapshot(user, "2026-09", 1);
    expect(first.expenses).toHaveLength(25);
    expect(second.expenses).toHaveLength(3);
    expect(first.totals).toEqual(second.totals);
    expect(first.totals.variable).toBe(2828);
    expect(
      new Set([...first.expenses, ...second.expenses].map((row) => row.id))
        .size,
    ).toBe(28);
  });
  it("blocks foreign IDs, arbitrary direct writes, anonymous RPCs and editing fixed costs", async () => {
    const a = await account();
    const b = await account();
    const id = randomUUID();
    expect(
      (await mutate(b, "expense", "create", id, expense)).error,
    ).toBeNull();
    const bIncome = (await snapshot(b)).incomes[0]!;
    for (const [kind, foreignId, payload] of [
      ["expense", id, expense],
      ["income", bIncome.id, income],
    ] as const) {
      expect(
        (await mutate(a, kind, "update", foreignId, payload)).error,
      ).not.toBeNull();
      expect((await mutate(a, kind, "delete", foreignId)).error).not.toBeNull();
      expect(
        (await mutate(a, kind, "create", foreignId, payload)).error,
      ).not.toBeNull();
    }
    expect((await snapshot(a)).expenses).toEqual([]);
    expect(
      (await a.client.from("expenses").select("*").eq("id", id)).data,
    ).toEqual([]);
    expect(
      (await a.client.from("expenses").update({ amount_minor: 1 }).eq("id", id))
        .error,
    ).not.toBeNull();
    const fixed = (await snapshot(a)).fixed[0]!;
    expect(
      (await mutate(a, "expense", "update", fixed.id, expense)).error,
    ).not.toBeNull();
    expect(
      (await mutate(a, "expense", "delete", fixed.id)).error,
    ).not.toBeNull();
    expect(
      (
        await mutate(a, "expense", "create", randomUUID(), {
          ...expense,
          user_id: b.id,
        })
      ).error,
    ).toBeNull();
    expect((await snapshot(b)).totals.variable).toBe(45000);
    expect(
      (await publicClient().rpc("read_money_month", { p_month: "2026-09" }))
        .error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_money", {
          p_kind: "expense",
          p_operation: "create",
          p_id: randomUUID(),
          p_revision: 0,
          p_payload: expense,
        })
      ).error,
    ).not.toBeNull();
  });
  it("validates direct API inputs and requires completed onboarding", async () => {
    const incomplete = await account(false);
    expect(
      (await mutate(incomplete, "income", "create", randomUUID(), income))
        .error,
    ).not.toBeNull();
    const user = await account();
    for (const change of [
      { amount: 0 },
      { amount: -1 },
      { amount: 1.1 },
      { amount: 100000000000 },
      { name: " " },
      { category: "unknown" },
      { spent_on: "2026-02-29" },
      { spent_on: "2100-02-29" },
      { spent_on: "2026-09-01T00:00:00Z" },
    ])
      expect(
        (
          await mutate(user, "expense", "create", randomUUID(), {
            ...expense,
            ...change,
          })
        ).error,
      ).not.toBeNull();
    expect((await snapshot(user)).expenses).toEqual([]);
    expect(
      (
        await mutate(user, "expense", "create", randomUUID(), {
          ...expense,
          spent_on: "2024-02-29",
          amount: 99999999999,
        })
      ).error,
    ).toBeNull();
    expect((await snapshot(user, "2024-02")).totals.variable).toBe(99999999999);
    expect(
      (await user.client.rpc("read_money_month", { p_month: "2026-13" })).error,
    ).not.toBeNull();
    expect(
      (
        await user.client.rpc("read_money_month", {
          p_month: "2026-09",
          p_income_page: -1,
        })
      ).error,
    ).not.toBeNull();
  });
});
