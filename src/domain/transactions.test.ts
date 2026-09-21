import { describe, expect, it } from "vitest";
import {
  availableMinor,
  dateInZone,
  dateSchema,
  expenseInputSchema,
} from "./transactions";

describe("transaction dates and exact month totals", () => {
  it.each(["2024-02-29", "2000-02-29", "2026-12-31", "2100-12-31"])(
    "accepts real calendar day %s",
    (value) => expect(dateSchema.safeParse(value).success).toBe(true),
  );
  it.each([
    "2026-02-29",
    "2100-02-29",
    "2026-04-31",
    "2026-01-00",
    "2026-13-01",
    "2026-9-01",
    "2026-09-01T00:00:00Z",
  ])("rejects invalid day %s", (value) =>
    expect(dateSchema.safeParse(value).success).toBe(false),
  );
  it("chooses the day in the profile zone across DST and year boundaries", () => {
    expect(dateInZone(new Date("2026-12-31T23:30:00Z"), "Europe/Berlin")).toBe(
      "2027-01-01",
    );
    expect(
      dateInZone(new Date("2026-12-31T23:30:00Z"), "America/New_York"),
    ).toBe("2026-12-31");
    expect(dateInZone(new Date("2026-03-29T22:30:00Z"), "Europe/Berlin")).toBe(
      "2026-03-30",
    );
  });
  it("validates categories and positive decimal amounts", () => {
    const input = {
      name: "Groceries",
      amount: "10,99",
      spent_on: "2026-09-01",
      category: "groceries",
    };
    expect(expenseInputSchema.parse(input).amount).toBe(1099);
    expect(
      expenseInputSchema.safeParse({ ...input, category: "arbitrary" }).success,
    ).toBe(false);
    expect(
      expenseInputSchema.safeParse({ ...input, amount: "0" }).success,
    ).toBe(false);
  });
  it("subtracts fixed, variable and planned savings exactly once, keeping negative results", () => {
    const totals = {
      income: 300000,
      variable: 1099,
      fixed: 90000,
      savings: 50000,
      income_count: 2,
      expense_count: 1,
    };
    expect(availableMinor(totals)).toBe(158901);
    expect(availableMinor({ ...totals, income: 10000 })).toBe(-131099);
    expect(() =>
      availableMinor({ ...totals, income: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow();
  });
});
