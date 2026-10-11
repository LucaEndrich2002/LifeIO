import { describe, expect, it } from "vitest";
import {
  latestReviewWeek,
  reviewDays,
  reviewWeek,
  reviewWeekSchema,
  weeklyInsights,
  weeklySnapshotSchema,
} from "./weekly-review";

function snapshotInput() {
  return {
    version: 1,
    currency: "EUR",
    week_start: "2026-09-28",
    week_end: "2026-10-04",
    time_zone: "Europe/Berlin",
    range_start: "2026-09-27T22:00:00Z",
    range_end: "2026-10-04T22:00:00Z",
    expenses: {
      current_minor: "0",
      current_count: 0,
      previous_minor: "0",
      previous_count: 0,
    },
    months: [
      {
        month: "2026-09",
        fixed_known: false,
        budget: null,
        totals: {
          income: "0",
          variable: "0",
          fixed: "0",
          savings: "0",
          income_count: 0,
          expense_count: 0,
        },
      },
    ],
    goals: {
      total: 0,
      items: [],
      contributions_minor: "0",
      contribution_count: 0,
      milestones_completed: 0,
      next_count: 0,
      next_items: [],
    },
    tasks: {
      open: 0,
      undated: 0,
      due_by_end: 0,
      next_due: 0,
      completed: 0,
      items: [],
    },
    events: { next_count: 0, items: [] },
  };
}
function snapshot() {
  return weeklySnapshotSchema.parse(snapshotInput());
}
describe("weekly review version 1", () => {
  it("selects the last completed Monday–Sunday in the profile zone", () => {
    const rollover = new Date("2026-10-11T22:30:00Z");
    expect(latestReviewWeek(rollover, "Europe/Berlin")).toBe("2026-10-05");
    expect(latestReviewWeek(rollover, "America/New_York")).toBe("2026-09-28");
    expect(
      latestReviewWeek(new Date("2026-10-11T12:00:00Z"), "Europe/Berlin"),
    ).toBe("2026-09-28");
    expect(reviewWeek("2027-01-03")).toBe("2026-12-28");
    expect(reviewDays("2026-12-28")).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
      previous: "2026-12-21",
      next: "2027-01-04",
      nextEnd: "2027-01-10",
    });
  });
  it("rejects invalid calendar dates and unsupported or non-Monday weeks without throwing", () => {
    for (const day of [
      "no-date",
      "2026-02-30",
      "2026-09-29",
      "1999-12-27",
      "2100-12-20",
    ])
      expect(reviewWeekSchema.safeParse(day).success).toBe(false);
    expect(reviewWeekSchema.safeParse("2000-01-03").success).toBe(true);
    expect(reviewWeekSchema.safeParse("2100-12-13").success).toBe(true);
  });
  it("does not invent comparisons when either week has no recorded expenses", () => {
    const data = snapshot();
    expect(weeklyInsights(data)).toEqual([]);
    data.expenses = {
      current_minor: 10000,
      current_count: 1,
      previous_minor: 0,
      previous_count: 0,
    };
    expect(weeklyInsights(data).map((h) => h.id)).toEqual(["basis"]);
    data.expenses.previous_count = 1;
    data.expenses.previous_minor = 15000;
    expect(weeklyInsights(data)[0]?.detail).toContain("50,00 € weniger");
  });
  it("prioritizes at most three reproducible hints and tests the exact 90 percent boundary", () => {
    const data = snapshot(),
      month = data.months[0]!;
    month.budget = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Budget",
      amount_minor: 10001,
      revision: 0,
      month: "2026-09-01",
    };
    month.totals.variable = 9000;
    expect(weeklyInsights(data).some((h) => h.id.startsWith("budget"))).toBe(
      false,
    );
    month.totals.variable = 9001;
    data.tasks.due_by_end = 1;
    data.tasks.open = 1;
    data.tasks.completed = 2;
    data.expenses = {
      current_minor: 1101,
      current_count: 1,
      previous_minor: 1000,
      previous_count: 1,
    };
    data.goals.contribution_count = 1;
    data.goals.contributions_minor = 5000;
    const hints = weeklyInsights(data);
    expect(hints.map((h) => h.id)).toEqual([
      "budget-2026-09",
      "due-tasks",
      "expenses",
    ]);
    expect(hints[2]?.detail).toContain("1,01 € mehr");
    expect(weeklyInsights(structuredClone(data))).toEqual(hints);
    month.totals.variable = 10002;
    expect(weeklyInsights(data)[0]?.title).toBe("Monatsbudget überschritten");
  });
  it("handles large exact cent totals and rejects values beyond safe transport", () => {
    const data = snapshot();
    data.expenses = {
      current_minor: Number.MAX_SAFE_INTEGER,
      current_count: 1,
      previous_minor: Number.MAX_SAFE_INTEGER - 1,
      previous_count: 1,
    };
    expect(weeklyInsights(data)[0]?.detail).toContain("0,01 € mehr");
    const input = snapshotInput();
    input.expenses.current_minor = "9007199254740991";
    expect(weeklySnapshotSchema.parse(input).expenses.current_minor).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    input.expenses.current_minor = "9007199254740992";
    expect(weeklySnapshotSchema.safeParse(input).success).toBe(false);
    input.expenses.current_minor = "0";
    input.currency = "USD";
    expect(weeklySnapshotSchema.safeParse(input).success).toBe(false);
  });
});
