import { describe, expect, it } from "vitest";
import {
  goalKindSchema,
  personalDeadlineLabel,
  personalGoalInputSchema,
  personalGoalMutationSchema,
} from "./personal-goals";

describe("personal goals without financial fields", () => {
  it("accepts trimmed Unicode names and rejects blank or oversized names", () => {
    expect(
      personalGoalInputSchema.parse({
        name: " \u00a0Lernen\ufeff ",
        deadline: "",
      }),
    ).toEqual({ name: "Lernen", deadline: "" });
    for (const name of ["", "\t\u00a0\ufeff", "🎯".repeat(81)])
      expect(
        personalGoalInputSchema.safeParse({ name, deadline: "" }).success,
      ).toBe(false);
    expect(
      personalGoalInputSchema.safeParse({ name: "🎯".repeat(80), deadline: "" })
        .success,
    ).toBe(true);
  });
  it("allows no deadline or a real supported calendar day", () => {
    for (const deadline of ["", "2000-01-01", "2028-02-29", "2100-12-31"])
      expect(
        personalGoalInputSchema.safeParse({ name: "Lernen", deadline }).success,
      ).toBe(true);
    for (const deadline of [
      "2027-02-29",
      "2026-04-31",
      "1999-12-31",
      "2101-01-01",
      "2026-09-27T00:00:00Z",
    ])
      expect(
        personalGoalInputSchema.safeParse({ name: "Lernen", deadline }).success,
      ).toBe(false);
  });
  it("validates kind, revision and bounded operations", () => {
    const input = {
      id: "a93b8a46-d75a-4a50-a9d2-27bf6972dfed",
      revision: "0",
      operation: "create",
    };
    expect(personalGoalMutationSchema.parse(input).revision).toBe(0);
    for (const change of [
      { id: "bad" },
      { revision: -1 },
      { revision: 2147483647 },
      { operation: "contribute" },
    ])
      expect(
        personalGoalMutationSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    expect(goalKindSchema.safeParse("personal").success).toBe(true);
    expect(goalKindSchema.safeParse("anything").success).toBe(false);
  });
  it("renders date-only values without shifting the calendar day", () => {
    expect(personalDeadlineLabel(null)).toBe("Kein Zieldatum festgelegt");
    expect(personalDeadlineLabel("2026-03-29")).toBe("Zieldatum: 29.03.2026");
    expect(personalDeadlineLabel("2026-10-25")).toBe("Zieldatum: 25.10.2026");
    expect(() => personalDeadlineLabel("2026-02-30")).toThrow();
  });
});
