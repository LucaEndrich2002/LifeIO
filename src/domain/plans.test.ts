import { describe, expect, it } from "vitest";
import {
  budgetInputSchema,
  budgetStatus,
  fixedInputSchema,
  nextMonth,
} from "./plans";

describe("fixed periods and monthly budgets", () => {
  it("accepts an inclusive one-month period and rejects reversed or invalid boundaries", () => {
    const input = {
      name: "Miete",
      amount: "900,01",
      month: "2026-12",
      end_month: "2026-12",
    };
    expect(fixedInputSchema.parse(input).amount).toBe(90001);
    expect(
      fixedInputSchema.safeParse({ ...input, end_month: "" }).success,
    ).toBe(true);
    expect(
      fixedInputSchema.safeParse({ ...input, end_month: "2026-11" }).success,
    ).toBe(false);
    expect(
      fixedInputSchema.safeParse({ ...input, month: "2026-13" }).success,
    ).toBe(false);
    expect(fixedInputSchema.safeParse({ ...input, amount: "0" }).success).toBe(
      false,
    );
  });
  it("advances calendar months across years without using a time zone", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
    expect(nextMonth("2024-02")).toBe("2024-03");
    expect(nextMonth("2100-11")).toBe("2100-12");
    expect(nextMonth("2100-12")).toBeNull();
    expect(() => nextMonth("2101-01")).toThrow();
  });
  it("requires a named positive monthly limit", () => {
    expect(
      budgetInputSchema.parse({
        name: " Alltag ",
        amount: "500",
        month: "2026-09",
      }),
    ).toEqual({ name: "Alltag", amount: 50000, month: "2026-09" });
    expect(
      budgetInputSchema.safeParse({ name: "", amount: "-1", month: "2026-09" })
        .success,
    ).toBe(false);
  });
  it("derives 90 percent and 50 EUR remaining from 500 EUR and 450 EUR", () => {
    expect(budgetStatus(50000, 45000)).toEqual({
      remaining: 5000,
      percent: "90",
      progress: 90,
    });
    expect(budgetStatus(50000, 55001)).toEqual({
      remaining: -5001,
      percent: "110",
      progress: 100,
    });
    expect(budgetStatus(50000, 0)).toEqual({
      remaining: 50000,
      percent: "0",
      progress: 0,
    });
    expect(budgetStatus(3, 1).percent).toBe("33");
  });
  it("never rounds large monetary inputs or percent products through floating point", () => {
    expect(budgetStatus(1, Number.MAX_SAFE_INTEGER).percent).toBe(
      "900719925474099100",
    );
    expect(() => budgetStatus(0, 100)).toThrow();
    expect(() => budgetStatus(100, 1.1)).toThrow();
    expect(() => budgetStatus(100, Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
