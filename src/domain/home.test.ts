import { describe, expect, it } from "vitest";
import {
  budgetAttention,
  homeGoalStatus,
  homeGoalsSchema,
  homePeriod,
  homeQuerySchema,
  homeInsightHref,
} from "./home";
import type { MoneySnapshot } from "./transactions";
const base = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Ziel",
  deadline: null,
  reached: false,
  milestone_total: 0,
  milestone_completed: 0,
};
describe("personal home rules", () => {
  it("preserves month and goal page in fixed insight links and rejects unsupported scopes", () => {
    expect(
      homeInsightHref({ month: "2026-09", goal_page: 1, insight: "goals" }),
    ).toBe("/account/home?month=2026-09&goal_page=1&insight=goals#home-ai");
    expect(homeInsightHref({ month: "2026-09", goal_page: 1 })).toBe(
      "/account/home?month=2026-09&goal_page=1#home-ai",
    );
    for (const insight of ["all", "https://example.test", ["month", "goals"]])
      expect(
        homeQuerySchema.safeParse({ month: "2026-09", insight }).success,
      ).toBe(false);
  });
  it("uses one profile-zone day and month, while a month selection leaves today unchanged", () => {
    const now = new Date("2026-09-30T23:30:00Z");
    expect(homePeriod(now, "Europe/Berlin")).toMatchObject({
      day: "2026-10-01",
      month: "2026-10",
    });
    expect(homePeriod(now, "America/New_York")).toMatchObject({
      day: "2026-09-30",
      month: "2026-09",
    });
    expect(homePeriod(now, "Europe/Berlin", "2025-12")).toMatchObject({
      day: "2026-10-01",
      month: "2025-12",
    });
  });
  it("uses exclusive day boundaries across short and long DST days", () => {
    for (const [day, hours] of [
      ["2026-03-29", 23],
      ["2026-10-25", 25],
    ] as const) {
      const { range } = homePeriod(
        new Date(`${day}T12:00:00Z`),
        "Europe/Berlin",
      );
      expect((Date.parse(range.end) - Date.parse(range.start)) / 3600000).toBe(
        hours,
      );
    }
  });
  it("warns at the exact 90 percent boundary, not a rounded display percentage", () => {
    const data = (spent: number, limit: number | null) =>
      ({
        budget: limit === null ? null : { amount_minor: limit },
        totals: { variable: spent },
      }) as MoneySnapshot;
    expect(budgetAttention(data(8999, 10000))).toBeNull();
    expect(budgetAttention(data(9000, 10000))).toBe("near");
    expect(budgetAttention(data(10000, 10000))).toBe("near");
    expect(budgetAttention(data(10001, 10000))).toBe("over");
    expect(budgetAttention(data(10001, null))).toBeNull();
    expect(budgetAttention(data(Number.MAX_SAFE_INTEGER, 99999999999))).toBe(
      "over",
    );
  });
  it("keeps unknown personal progress and actual overfunding distinct from completion", () => {
    expect(
      homeGoalStatus(
        {
          ...base,
          kind: "personal",
          target_minor: null,
          balance: null,
          rates: [],
        },
        "2026-10-01",
      ),
    ).toMatchObject({ progress: null, reached: false });
    expect(
      homeGoalStatus(
        {
          ...base,
          kind: "personal",
          target_minor: null,
          balance: null,
          rates: [],
          milestone_total: 26,
          milestone_completed: 25,
        },
        "2026-10-01",
      ),
    ).toMatchObject({ progress: 96, reached: false });
    expect(
      homeGoalStatus(
        {
          ...base,
          kind: "financial",
          target_minor: 10000,
          balance: 12000,
          rates: [{ month: "2026-09-01", amount_minor: 0 }],
        },
        "2026-10-01",
      ),
    ).toMatchObject({ progress: 100, percent: "120", reached: true });
  });
  it("rejects invalid navigation and incomplete or inconsistent aggregates", () => {
    expect(homeQuerySchema.safeParse({ month: "2026-13" }).success).toBe(false);
    expect(
      homeQuerySchema.safeParse({ month: "2026-09", goal_page: -1 }).success,
    ).toBe(false);
    expect(
      homeGoalsSchema.safeParse({ items: [], total: 0, overdue: 1 }).success,
    ).toBe(false);
    expect(
      homeGoalsSchema.safeParse({
        items: [
          {
            ...base,
            kind: "personal",
            target_minor: null,
            balance: null,
            rates: [],
            milestone_total: 1,
            milestone_completed: 2,
          },
        ],
        total: 1,
        overdue: 0,
      }).success,
    ).toBe(false);
  });
});
