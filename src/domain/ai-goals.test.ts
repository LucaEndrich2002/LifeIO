import { describe, expect, it } from "vitest";
import {
  aiGoalsFactsSchema,
  aiGoalsQuestionSchema,
  aiGoalsExplanationSchema,
  aiGoalAssessment,
  aiGoalsHref,
  aiGoalsSource,
  type AiOverviewGoal,
} from "./ai-goals";
import { goalsFacts, goalsAnswer } from "../../tests/ai-goals-fixture";

describe("goal overview facts and assessment", () => {
  it("distinguishes forecast risks, missing basis and actual completion without predicting personal goals", () => {
    const financial = goalsFacts.goals[0]!;
    const personal = goalsFacts.goals[1]!;
    expect(aiGoalAssessment(financial, goalsFacts.as_of)).toBe("late");
    expect(aiGoalAssessment(personal, goalsFacts.as_of)).toBe("unknown");
    for (const [patch, expected] of [
      [{ deadline_status: "on_time" }, "on_time"],
      [{ deadline_status: "overdue" }, "overdue"],
      [
        { deadline_status: "unavailable", projection_status: "unplanned" },
        "unknown",
      ],
      [
        { deadline_status: "unavailable", projection_status: "beyond_range" },
        "unknown",
      ],
      [{ deadline_status: null, deadline: null }, "no_deadline"],
      [{ projection_status: "reached" }, "reached"],
    ] as const)
      expect(
        aiGoalAssessment(
          { ...financial, ...patch } as AiOverviewGoal,
          goalsFacts.as_of,
        ),
      ).toBe(expected);
    expect(
      aiGoalAssessment(
        { ...personal, deadline: "2026-10-08" },
        goalsFacts.as_of,
      ),
    ).toBe("overdue");
    expect(
      aiGoalAssessment(
        { ...personal, deadline: "2026-10-09" },
        goalsFacts.as_of,
      ),
    ).toBe("unknown");
    expect(
      aiGoalAssessment({ ...personal, deadline: null }, goalsFacts.as_of),
    ).toBe("no_deadline");
    expect(
      aiGoalAssessment(
        { ...personal, kind: "personal", milestones: 2, completed: 2 },
        goalsFacts.as_of,
      ),
    ).toBe("reached");
  });
  it("rejects inconsistent money, projection, deadline, coverage and labels without throwing on malformed values", () => {
    expect(aiGoalsFactsSchema.parse(goalsFacts)).toEqual(goalsFacts);
    for (const patch of [
      { balance: "25000.5" },
      { target: "not money" },
      { remaining: "2" },
      { projected_date: null },
      { deadline_status: "on_time" },
      { projection_status: "reached" },
      { target: "100000000000" },
    ]) {
      expect(
        aiGoalsFactsSchema.safeParse({
          ...goalsFacts,
          goals: [{ ...goalsFacts.goals[0], ...patch }, goalsFacts.goals[1]],
        }).success,
      ).toBe(false);
    }
    for (const facts of [
      { ...goalsFacts, total: 3 },
      { ...goalsFacts, page: 1 },
      { ...goalsFacts, user_id: "foreign" },
      {
        ...goalsFacts,
        goals: [goalsFacts.goals[0], { ...goalsFacts.goals[1], label: "A" }],
      },
      {
        ...goalsFacts,
        goals: [goalsFacts.goals[0], { ...goalsFacts.goals[1], completed: 1 }],
      },
    ])
      expect(aiGoalsFactsSchema.safeParse(facts).success).toBe(false);
    expect(
      aiGoalsFactsSchema.safeParse({
        ...goalsFacts,
        page: 1,
        total: 7,
        goals: [goalsFacts.goals[0]],
      }).success,
    ).toBe(true);
  });
  it("bounds pages, requires consent and limits answer sources and numeric claims", () => {
    const request = {
      page: "0",
      fingerprint: "a".repeat(64),
      question: "",
      consent: "yes",
    };
    expect(aiGoalsQuestionSchema.parse(request).page).toBe(0);
    for (const patch of [
      { page: "1001" },
      { page: "-1" },
      { page: "0.5" },
      { consent: "no" },
      { goal_ids: [] },
      { question: "x".repeat(601) },
    ])
      expect(
        aiGoalsQuestionSchema.safeParse({ ...request, ...patch }).success,
      ).toBe(false);
    expect(aiGoalsExplanationSchema.safeParse(goalsAnswer).success).toBe(true);
    expect(
      aiGoalsExplanationSchema.safeParse({
        ...goalsAnswer,
        sources: ["financial"],
      }).success,
    ).toBe(false);
    expect(
      aiGoalsExplanationSchema.safeParse({
        ...goalsAnswer,
        paragraphs: ["Ziel A braucht 5 Monate."],
      }).success,
    ).toBe(false);
    expect(aiGoalsHref(1)).toBe("/account/ai/goals?page=1");
    expect(aiGoalsSource(1).href).toBe("/account/home?goal_page=1#home-goals");
    expect(() => aiGoalsHref(1001)).toThrow();
  });
});
