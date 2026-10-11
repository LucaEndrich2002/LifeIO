import { describe, expect, it } from "vitest";
import {
  amountInput,
  euroAmount,
  formatEuro,
  monthInZone,
  monthSchema,
  parseEuro,
  sumMinor,
} from "./money";
import {
  expensesSchema,
  goalSchema,
  incomeSchema,
  nextStep,
} from "./onboarding";

describe("exact EUR amounts", () => {
  it.each([
    ["0,01", 1],
    ["10.99", 1099],
    [" 2800,5 ", 280050],
    ["999999999,99", 99999999999],
    ["0", 0],
  ])("parses %s by place value", (input, expected) =>
    expect(parseEuro(String(input))).toBe(expected),
  );
  it.each([
    "-1",
    "+1",
    "1e3",
    "1,001",
    "1.000,00",
    "NaN",
    "",
    "01",
    "1000000000",
    "0x10",
    "1.",
  ])("rejects ambiguous or out-of-range input %s", (input) =>
    expect(parseEuro(input)).toBeNull(),
  );
  it("enforces positive entries and allows zero only for goal progress/contributions", () => {
    expect(euroAmount().safeParse("0").success).toBe(false);
    expect(euroAmount(true).parse("0")).toBe(0);
    expect(
      incomeSchema.safeParse({
        decision: "saved",
        month: "2026-09",
        name: " ",
        amount: "100",
      }).success,
    ).toBe(false);
    expect(
      goalSchema.parse({
        decision: "saved",
        name: "Goal",
        target: "100",
        current: "120",
        monthly: "0",
      }),
    ).toMatchObject({ current: 12000 });
  });
  it("sums exactly, preserves negative balances and detects unsafe arithmetic", () => {
    expect(sumMinor([280000, 20000])).toBe(300000);
    expect(sumMinor([10, 20])).toBe(30);
    expect(formatEuro(sumMinor([10000, -20000, -5000]))).toBe("−150,00 €");
    expect(formatEuro(99999999999)).toBe("999.999.999,99 €");
    expect(amountInput(1099)).toBe("10,99");
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow();
  });
});
describe("onboarding boundaries", () => {
  it("uses the profile timezone across year and month boundaries", () => {
    const instant = new Date("2026-12-31T23:30:00Z");
    expect(monthInZone(instant, "Europe/Berlin")).toBe("2027-01");
    expect(monthInZone(instant, "America/New_York")).toBe("2026-12");
    expect(monthInZone(new Date("2026-03-31T22:30:00Z"), "Europe/Berlin")).toBe(
      "2026-04",
    );
    expect(monthInZone(new Date("2026-10-31T23:30:00Z"), "Europe/Berlin")).toBe(
      "2026-11",
    );
    expect(monthSchema.safeParse("2026-13").success).toBe(false);
    expect(monthSchema.safeParse("1999-12").success).toBe(false);
  });
  it("requires an explicit saved or skipped decision, without inventing entries", () => {
    expect(incomeSchema.safeParse({ month: "2026-09" }).success).toBe(false);
    expect(
      incomeSchema.parse({
        decision: "skipped",
        month: "2026-09",
        amount: "invalid",
      }),
    ).toEqual({ decision: "skipped", month: "2026-09" });
    expect(
      expensesSchema.safeParse({ decision: "saved", items: [] }).success,
    ).toBe(false);
    expect(
      expensesSchema.safeParse({
        decision: "saved",
        items: Array.from({ length: 21 }, () => ({
          name: "Fixed",
          amount: "1",
        })),
      }).success,
    ).toBe(false);
    expect(nextStep(null)).toBe("income");
    expect(
      nextStep({
        income_status: "skipped",
        expenses_status: "saved",
        goal_status: "pending",
        tasks_status: "pending",
      }),
    ).toBe("goal");
  });
});
