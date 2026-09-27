import { describe, expect, it } from "vitest";
import { forecastGoal } from "./goal-forecast";
import { MAX_AMOUNT_MINOR } from "./money";
import { dateInZone } from "./transactions";

const base = {
  targetMinor: 1_000_000,
  balanceMinor: 350_000,
  today: "2026-09-26",
  deadline: null,
  rates: [{ month: "2026-09-01", amount_minor: 50_000 }],
};

describe("savings forecast from actual balance and future monthly rates", () => {
  it("meets J04 with 13 future contributions and an explicit next contribution", () => {
    expect(forecastGoal(base)).toEqual({
      status: "projected",
      remainingMinor: 650_000,
      contributions: 13,
      nextContributionDate: "2026-10-31",
      date: "2027-10-31",
      deadlineStatus: null,
    });
  });

  it("rounds up at a single missing cent without decimal monetary arithmetic", () => {
    expect(forecastGoal({ ...base, targetMinor: 450_001 })).toMatchObject({
      contributions: 3,
      date: "2026-12-31",
      remainingMinor: 100_001,
    });
  });

  it.each([1_000_000, 1_000_001])(
    "does not invent a past achievement date at balance %i",
    (balanceMinor) => {
      expect(
        forecastGoal({ ...base, balanceMinor, deadline: "2025-01-01" }),
      ).toEqual({
        status: "reached",
        contributions: 0,
        remainingMinor: 0,
        deadlineStatus: null,
      });
    },
  );

  it.each([
    { rates: [] },
    { rates: [{ month: "2026-09-01", amount_minor: 0 }] },
  ])("does not invent a date without positive rates: %j", ({ rates }) => {
    expect(forecastGoal({ ...base, rates })).toMatchObject({
      status: "unplanned",
    });
  });

  it("applies increases, pauses and restarts in effective-month order without mutating history", () => {
    const rates = [
      { month: "2027-01-01", amount_minor: 100_000 },
      { month: "2026-09-01", amount_minor: 50_000 },
      { month: "2026-11-01", amount_minor: 0 },
    ];
    const before = structuredClone(rates);
    expect(
      forecastGoal({ ...base, balanceMinor: 0, targetMinor: 300_000, rates }),
    ).toMatchObject({
      status: "projected",
      contributions: 4,
      nextContributionDate: "2026-10-31",
      date: "2027-03-31",
    });
    expect(rates).toEqual(before);
  });

  it("waits for a future first rate and counts only positive contributions", () => {
    expect(
      forecastGoal({
        ...base,
        targetMinor: 550_000,
        rates: [{ month: "2027-01-01", amount_minor: 100_000 }],
      }),
    ).toMatchObject({
      contributions: 2,
      nextContributionDate: "2027-01-31",
      date: "2027-02-28",
    });
  });

  it("does not extrapolate an old positive rate past a permanent pause", () => {
    expect(
      forecastGoal({
        ...base,
        rates: [...base.rates, { month: "2026-11-01", amount_minor: 0 }],
      }),
    ).toMatchObject({ status: "unplanned" });
  });

  it("does not catch up missed contributions and responds only to a changed actual balance", () => {
    expect(forecastGoal({ ...base, today: "2026-10-01" })).toMatchObject({
      contributions: 13,
      date: "2027-11-30",
    });
    expect(
      forecastGoal({ ...base, today: "2026-10-01", balanceMinor: 400_000 }),
    ).toMatchObject({ contributions: 12, date: "2027-10-31" });
  });

  it.each([
    ["2028-01-31", "2028-02-29"],
    ["2027-01-01", "2027-02-28"],
    ["2026-12-31", "2027-01-31"],
  ])("uses the real end of next month from %s", (today, date) => {
    expect(
      forecastGoal({ ...base, today, targetMinor: 350_001 }),
    ).toMatchObject({ date, nextContributionDate: date });
  });

  it("uses profile-local calendar boundaries rather than browser or server timezone", () => {
    const instant = new Date("2026-10-31T23:30:00Z");
    const berlin = dateInZone(instant, "Europe/Berlin");
    const losAngeles = dateInZone(instant, "America/Los_Angeles");
    expect(
      forecastGoal({ ...base, today: berlin, targetMinor: 350_001 }),
    ).toMatchObject({ date: "2026-12-31" });
    expect(
      forecastGoal({ ...base, today: losAngeles, targetMinor: 350_001 }),
    ).toMatchObject({ date: "2026-11-30" });
  });

  it("compares exact deadlines, including dates in the projection month and overdue goals", () => {
    expect(
      forecastGoal({ ...base, deadline: "2027-10-31" }).deadlineStatus,
    ).toBe("on_time");
    expect(
      forecastGoal({ ...base, deadline: "2027-10-30" }).deadlineStatus,
    ).toBe("late");
    expect(forecastGoal({ ...base, deadline: base.today }).deadlineStatus).toBe(
      "late",
    );
    expect(
      forecastGoal({ ...base, deadline: "2026-09-25" }).deadlineStatus,
    ).toBe("overdue");
    expect(
      forecastGoal({ ...base, deadline: "2027-10-31", rates: [] })
        .deadlineStatus,
    ).toBe("unavailable");
  });

  it("bounds very small rates at year 2100 and preserves maximum supported cents", () => {
    const rates = [{ month: "2026-09-01", amount_minor: 1 }];
    expect(
      forecastGoal({
        ...base,
        targetMinor: MAX_AMOUNT_MINOR,
        balanceMinor: 0,
        rates,
      }),
    ).toMatchObject({
      status: "beyond_range",
      remainingMinor: MAX_AMOUNT_MINOR,
    });
    expect(
      forecastGoal({
        ...base,
        targetMinor: MAX_AMOUNT_MINOR,
        balanceMinor: MAX_AMOUNT_MINOR - 1,
        rates,
      }),
    ).toMatchObject({
      status: "projected",
      contributions: 1,
      date: "2026-10-31",
    });
  });

  it("includes December 2100 but never fabricates a date beyond the supported calendar", () => {
    expect(
      forecastGoal({ ...base, targetMinor: 350_001, today: "2100-11-30" }),
    ).toMatchObject({ status: "projected", date: "2100-12-31" });
    expect(
      forecastGoal({ ...base, targetMinor: 350_001, today: "2100-12-01" }),
    ).toMatchObject({ status: "beyond_range" });
  });

  it("rejects invalid amounts, dates and ambiguous rate histories", () => {
    for (const targetMinor of [0, -1, 0.1, NaN, MAX_AMOUNT_MINOR + 1])
      expect(() => forecastGoal({ ...base, targetMinor })).toThrow();
    expect(() => forecastGoal({ ...base, balanceMinor: -1 })).toThrow();
    expect(() => forecastGoal({ ...base, today: "2026-02-29" })).toThrow();
    expect(() => forecastGoal({ ...base, deadline: "2027-02-29" })).toThrow();
    expect(() =>
      forecastGoal({
        ...base,
        rates: [{ month: "2026-09-15", amount_minor: 1 }],
      }),
    ).toThrow();
    expect(() =>
      forecastGoal({
        ...base,
        rates: [{ month: "2026-09-01", amount_minor: 0.1 }],
      }),
    ).toThrow();
    expect(() =>
      forecastGoal({ ...base, rates: [...base.rates, ...base.rates] }),
    ).toThrow();
  });
});
