import { describe, expect, it } from "vitest";
import {
  contributionInputSchema,
  goalInputSchema,
  goalProgress,
  goalSnapshotSchema,
} from "./goals";

describe("saving goal amounts and progress", () => {
  const input = {
    name: " Reserve ",
    target: "10000",
    opening: "3500",
    monthly: "500",
    month: "2026-09",
    deadline: "2027-10-01",
  };
  it("distinguishes an opening balance from a positive target and allows pausing planned savings", () => {
    expect(
      goalInputSchema.parse({ ...input, opening: "0", monthly: "0" }),
    ).toMatchObject({
      name: "Reserve",
      target: 1000000,
      opening: 0,
      monthly: 0,
    });
    expect(goalInputSchema.safeParse({ ...input, target: "0" }).success).toBe(
      false,
    );
    expect(goalInputSchema.safeParse({ ...input, opening: "-1" }).success).toBe(
      false,
    );
    expect(
      goalInputSchema.safeParse({ ...input, monthly: "1,001" }).success,
    ).toBe(false);
  });
  it("validates optional real deadlines and positive dated contributions", () => {
    expect(goalInputSchema.safeParse({ ...input, deadline: "" }).success).toBe(
      true,
    );
    expect(
      goalInputSchema.safeParse({ ...input, deadline: "2026-02-29" }).success,
    ).toBe(false);
    expect(
      contributionInputSchema.parse({
        amount: "10,01",
        date: "2024-02-29",
        note: " Einzahlung ",
      }),
    ).toEqual({ amount: 1001, date: "2024-02-29", note: "Einzahlung" });
    expect(
      contributionInputSchema.safeParse({
        amount: "0",
        date: "2026-09-26",
        note: "",
      }).success,
    ).toBe(false);
  });
  it("shows actual progress and keeps oversaving visible beyond a full progress bar", () => {
    expect(goalProgress(1000000, 350000)).toEqual({
      percent: "35",
      progress: 35,
      reached: false,
    });
    expect(goalProgress(10000, 12500)).toEqual({
      percent: "125",
      progress: 100,
      reached: true,
    });
    expect(goalProgress(10000, 10000).reached).toBe(true);
    expect(goalProgress(10000, 0).percent).toBe("0");
  });
  it("does not round large monetary values through floating point", () => {
    expect(goalProgress(1, 99999999999).percent).toBe("9999999999900");
    expect(() => goalProgress(0, 0)).toThrow();
    expect(() => goalProgress(1, 0.1)).toThrow();
    expect(() => goalProgress(1, Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
  it("rejects out-of-range aggregate balances and missing rate history", () => {
    const id = "e4e6cd89-4b27-40d5-ae9e-a2b9e38740ee";
    const data = {
      goal: {
        id,
        name: "Reserve",
        target_minor: 100,
        current_minor: 0,
        monthly_minor: 0,
        deadline: null,
        revision: 0,
      },
      balance: "100",
      rates: [{ month: "2026-09-01", amount_minor: 0 }],
      entries: [],
      count: 0,
    };
    expect(goalSnapshotSchema.parse(data).balance).toBe(100);
    expect(
      goalSnapshotSchema.safeParse({ ...data, balance: "100000000000" })
        .success,
    ).toBe(false);
    expect(goalSnapshotSchema.safeParse({ ...data, rates: [] }).success).toBe(
      false,
    );
  });
});
