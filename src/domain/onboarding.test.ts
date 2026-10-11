import { describe, expect, it } from "vitest";
import { nextStep, onboardingTasksSchema } from "./onboarding";

const task = {
  title: "  Reise planen  ",
  priority: "high",
  due_on: "2028-02-29",
};
describe("optional onboarding tasks", () => {
  it("reuses task rules, real calendar days and Unicode character limits", () => {
    expect(
      onboardingTasksSchema.parse({ decision: "saved", items: [task] }),
    ).toEqual({
      decision: "saved",
      items: [{ ...task, title: "Reise planen" }],
    });
    for (const value of [
      { ...task, due_on: "2027-02-29" },
      { ...task, due_on: "2101-01-01" },
      { ...task, priority: "urgent" },
      { ...task, title: "\u00a0\n" },
      { ...task, title: "😀".repeat(81) },
    ])
      expect(
        onboardingTasksSchema.safeParse({ decision: "saved", items: [value] })
          .success,
      ).toBe(false);
    expect(
      onboardingTasksSchema.safeParse({
        decision: "saved",
        items: [{ ...task, title: "😀".repeat(80), due_on: "" }],
      }).success,
    ).toBe(true);
  });
  it("requires one to three tasks or an explicit skip", () => {
    for (const items of [[], [task, task, task, task]])
      expect(
        onboardingTasksSchema.safeParse({ decision: "saved", items }).success,
      ).toBe(false);
    expect(
      onboardingTasksSchema.safeParse({
        decision: "saved",
        items: [task, task, task],
      }).success,
    ).toBe(true);
    expect(onboardingTasksSchema.safeParse({ items: [task] }).success).toBe(
      false,
    );
    expect(
      onboardingTasksSchema.parse({
        decision: "skipped",
        items: [{ title: "" }],
      }),
    ).toEqual({ decision: "skipped" });
  });
  it("resumes at tasks before review and respects both saved and skipped decisions", () => {
    const state = {
      income_status: "skipped",
      expenses_status: "saved",
      goal_status: "skipped",
      tasks_status: "pending",
    };
    expect(nextStep(state)).toBe("tasks");
    for (const tasks_status of ["saved", "skipped", "not_offered"])
      expect(nextStep({ ...state, tasks_status })).toBe("review");
  });
});
