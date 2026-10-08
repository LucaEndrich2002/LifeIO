import { describe, expect, it } from "vitest";
import {
  aiGoalFactsSchema,
  aiGoalQuestionSchema,
  aiGoalExplanationSchema,
  aiGoalRows,
  aiGoalSource,
} from "./ai-goal";
import { goalFacts, goalAnswer, goalId } from "../../tests/ai-goal-fixture";
describe("AI goal contract", () => {
  it("renders original integer amounts, dates and the deadline comparison", () => {
    expect(aiGoalFactsSchema.parse(goalFacts)).toEqual(goalFacts);
    const rows = Object.fromEntries(aiGoalRows(goalFacts));
    expect(rows.Zielbetrag).toBe("10.000,00 €");
    expect(rows["Noch benötigte Beiträge"]).toBe("13");
    expect(rows["Voraussichtlich erreicht"]).toBe("31. Oktober 2027");
    expect(rows.Terminvergleich).toContain("nach dem Zieldatum");
    expect(
      aiGoalFactsSchema.safeParse({ ...goalFacts, balance: "1.25" }).success,
    ).toBe(false);
    expect(
      aiGoalFactsSchema.safeParse({ ...goalFacts, projected_date: null })
        .success,
    ).toBe(false);
  });
  it("shows missing projection and reached goals without inventing future dates", () => {
    for (const status of ["unplanned", "beyond_range", "reached"] as const) {
      const facts = aiGoalFactsSchema.parse({
        ...goalFacts,
        projection_status: status,
        projected_date: null,
        next_contribution_date: null,
        contributions: status === "reached" ? 0 : null,
      });
      expect(
        Object.fromEntries(aiGoalRows(facts))["Voraussichtlich erreicht"],
      ).toBe("Kein zukünftiges Datum berechnet");
    }
  });
  it("requires explicit consent, refuses extra capabilities and accepts only the fixed source", () => {
    const request = {
      goal_id: goalId,
      fingerprint: "a".repeat(64),
      question: "Warum?",
      consent: "yes",
    };
    expect(aiGoalQuestionSchema.safeParse(request).success).toBe(true);
    for (const item of [
      { ...request, consent: "" },
      { ...request, user_id: goalId },
      { ...request, tools: ["run_sql"] },
    ])
      expect(aiGoalQuestionSchema.safeParse(item).success).toBe(false);
    expect(aiGoalExplanationSchema.safeParse(goalAnswer).success).toBe(true);
    for (const answer of [
      { ...goalAnswer, paragraphs: ["In 13 Monaten"] },
      { ...goalAnswer, sources: ["financial"] },
      { ...goalAnswer, sources: ["https://example.com"] },
    ])
      expect(aiGoalExplanationSchema.safeParse(answer).success).toBe(false);
    expect(aiGoalSource(goalId).href).toBe(`/account/goals/${goalId}`);
    expect(() => aiGoalSource("../other")).toThrow();
  });
});
