import { describe, expect, it } from "vitest";
import {
  aiReadRequestSchema,
  aiReadGrantSchema,
  aiReadToolNames,
  aiFinancialFacts,
  aiBudgetFacts,
  aiPage,
} from "./ai-read-tools";
import { aiEventRange } from "./ai-event-range";
import type { MoneySnapshot } from "./transactions";
const money = {
  incomes: [],
  expenses: [],
  fixed: [],
  savings_plans: [],
  goal_count: 1,
  fixed_known: true,
  budget: {
    month: "2026-09",
    id: "00000000-0000-4000-8000-000000000001",
    name: "Private budget name",
    amount_minor: 50000,
    revision: 0,
  },
  totals: {
    income: 280000,
    fixed: 90000,
    variable: 55000,
    savings: 50000,
    income_count: 1,
    expense_count: 2,
  },
} satisfies MoneySnapshot;
describe("authorized AI read contract", () => {
  it("allows exactly six read names and rejects writes, extra privileges, SQL and owner injection", () => {
    expect(aiReadToolNames).toHaveLength(6);
    const valid = {
      name: "get_financial_summary",
      arguments: { month: "2026-09" },
    };
    expect(aiReadRequestSchema.safeParse(valid).success).toBe(true);
    for (const request of [
      { ...valid, name: "create_task" },
      { ...valid, user_id: "someone" },
      { ...valid, arguments: { month: "2026-09", user_id: "someone" } },
      {
        ...valid,
        arguments: { month: "2026-09", sql: "select * from auth.users" },
      },
      {
        ...valid,
        arguments: { month: "2026-09", allowedTools: aiReadToolNames },
      },
      { ...valid, arguments: { month: "2026-09", url: "https://example.com" } },
    ])
      expect(aiReadRequestSchema.safeParse(request).success).toBe(false);
    expect(aiReadGrantSchema.safeParse([]).success).toBe(true);
    expect(
      aiReadGrantSchema.safeParse(["get_goals", "get_goals"]).success,
    ).toBe(false);
    expect(aiReadGrantSchema.safeParse(["delete_goal"]).success).toBe(false);
  });
  it("bounds pages and event windows without coercing strings or accepting invalid dates", () => {
    for (const page of [-1, 1001, 0.5, "0", null])
      expect(
        aiReadRequestSchema.safeParse({
          name: "get_goals",
          arguments: { page },
        }).success,
      ).toBe(false);
    for (const days of [0, 8, 1.5, "7"])
      expect(
        aiReadRequestSchema.safeParse({
          name: "get_upcoming_events",
          arguments: { day: "2026-10-01", days },
        }).success,
      ).toBe(false);
    expect(
      aiReadRequestSchema.safeParse({
        name: "get_tasks",
        arguments: { day: "2026-02-30", view: "week" },
      }).success,
    ).toBe(false);
    expect(
      aiReadRequestSchema.safeParse({
        name: "get_goal_projection",
        arguments: { goal_id: "../user" },
      }).success,
    ).toBe(false);
    expect(aiPage(0, 25, 26)).toEqual({
      page: 0,
      page_size: 25,
      total: 26,
      has_more: true,
    });
    expect(aiPage(1, 25, 26).has_more).toBe(false);
  });
  it("exports exact integer amounts and missing basis without private ledger records", () => {
    const facts = aiFinancialFacts(money);
    expect(facts).toMatchObject({
      currency: "EUR",
      amount_unit: "minor",
      available_minor: "85000",
      missing_basis: [],
    });
    expect(
      aiFinancialFacts({ ...money, fixed_known: false }).available_minor,
    ).toBeNull();
    expect(
      aiFinancialFacts({
        ...money,
        totals: { ...money.totals, income_count: 0 },
      }).missing_basis,
    ).toEqual(["income"]);
    expect(JSON.stringify(facts)).not.toContain("Private budget name");
    expect(facts).not.toHaveProperty("incomes");
    expect(facts).not.toHaveProperty("savings_plans");
    expect(
      aiFinancialFacts({
        ...money,
        totals: {
          ...money.totals,
          income: Number.MAX_SAFE_INTEGER,
          variable: 0,
          fixed: 0,
          savings: 0,
        },
      }).available_minor,
    ).toBe("9007199254740991");
  });
  it("keeps missing budgets, negative remainders and precise warning thresholds distinct", () => {
    expect(aiBudgetFacts(money)).toMatchObject({
      remaining_minor: "-5000",
      percent_rounded: "110",
      attention: "over",
    });
    expect(aiBudgetFacts({ ...money, budget: null })).toEqual({
      status: "not_set",
      currency: "EUR",
      amount_unit: "minor",
    });
    expect(
      aiBudgetFacts({ ...money, totals: { ...money.totals, variable: 44999 } }),
    ).toMatchObject({ percent_rounded: "90", attention: null });
  });
  it("clips upcoming events to now, includes ongoing events and respects DST and year boundaries", () => {
    expect(
      aiEventRange(
        "2026-10-25",
        1,
        "Europe/Berlin",
        new Date("2026-10-25T01:30:00Z"),
      ),
    ).toEqual({ start: "2026-10-25T01:30:00Z", end: "2026-10-25T23:00:00Z" });
    const spring = aiEventRange(
      "2026-03-29",
      1,
      "Europe/Berlin",
      new Date("2026-03-28T12:00:00Z"),
    );
    expect((Date.parse(spring.end) - Date.parse(spring.start)) / 3600000).toBe(
      23,
    );
    expect(
      aiEventRange(
        "2026-12-31",
        2,
        "Europe/Berlin",
        new Date("2026-12-30T12:00:00Z"),
      ).end,
    ).toBe("2027-01-01T23:00:00Z");
    expect(() =>
      aiEventRange(
        "2026-10-24",
        1,
        "Europe/Berlin",
        new Date("2026-10-25T12:00:00Z"),
      ),
    ).toThrow();
  });
});
