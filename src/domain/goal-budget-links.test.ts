import { describe, expect, it } from "vitest";
import {
  goalBudgetMutationSchema,
  linkedBudgetSchema,
  goalBudgetPageSchema,
  budgetGoalPageSchema,
} from "./goal-budget-links";
const id = "fbb80dbf-c575-4254-b607-d68dd0d8d890";
const budget = {
  id,
  name: "Monatsbudget",
  month: "2026-09-01",
  amount_minor: 50000,
  currency: "EUR",
};
describe("typed goal budget links", () => {
  it("accepts only supported operations, identifiers and safe return pages", () => {
    const input = { id, goal_id: id, budget_id: id, operation: "create" };
    expect(goalBudgetMutationSchema.parse(input).return_page).toBe(0);
    for (const change of [
      { budget_id: "" },
      { goal_id: "foreign" },
      { id: "bad" },
      { operation: "update" },
      { return_page: -1 },
      { return_page: 1000001 },
      { return_page: "/auth/login" },
    ])
      expect(
        goalBudgetMutationSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
  });
  it("requires a real budget month, positive bounded integer cents and explicit currency", () => {
    expect(linkedBudgetSchema.parse(budget)).toEqual(budget);
    for (const change of [
      { month: "2026-09-02" },
      { month: "2026-13-01" },
      { month: "2101-01-01" },
      { amount_minor: 0 },
      { amount_minor: 0.5 },
      { amount_minor: 100000000000 },
      { currency: "USD" },
    ])
      expect(
        linkedBudgetSchema.safeParse({ ...budget, ...change }).success,
      ).toBe(false);
  });
  it("keeps full counts while enforcing bounded pages and known target kinds", () => {
    expect(
      goalBudgetPageSchema.parse({ items: [{ id, budget }], count: 26 }).count,
    ).toBe(26);
    expect(
      goalBudgetPageSchema.safeParse({ items: [{ id, budget }], count: 0 })
        .success,
    ).toBe(false);
    expect(
      goalBudgetPageSchema.safeParse({
        items: Array(26).fill({ id, budget }),
        count: 26,
      }).success,
    ).toBe(false);
    expect(
      budgetGoalPageSchema.safeParse({
        items: [{ id, goal: { id, name: "Ziel", kind: "personal" } }],
        count: 1,
      }).success,
    ).toBe(true);
    expect(
      budgetGoalPageSchema.safeParse({
        items: [{ id, goal: { id, name: "Ziel", kind: "task" } }],
        count: 1,
      }).success,
    ).toBe(false);
  });
});
