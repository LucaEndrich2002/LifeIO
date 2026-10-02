import { describe, expect, it } from "vitest";
import {
  aiQuestionSchema,
  aiExplanationSchema,
  aiMonthRows,
  aiMonthSources,
  aiMonthFactsSchema,
} from "./ai-month";
import { monthFacts, monthAnswer } from "../../tests/ai-month-fixture";
describe("monthly AI consent and facts", () => {
  const request = {
    month: "2026-09",
    fingerprint: "a".repeat(64),
    question: "Mein Monat?",
    consent: "yes",
  };
  it("requires exact consent, a bounded question and strict server-selected scope", () => {
    expect(aiQuestionSchema.safeParse(request).success).toBe(true);
    for (const invalid of [
      { ...request, consent: false },
      { ...request, consent: "" },
      { ...request, month: "2026-13" },
      { ...request, fingerprint: "bad" },
      { ...request, question: "x".repeat(601) },
      { ...request, tools: ["get_goals"] },
      { ...request, user_id: "another" },
    ])
      expect(aiQuestionSchema.safeParse(invalid).success).toBe(false);
  });
  it("renders exact calculated values and unknown data independently of AI", () => {
    expect(aiMonthRows(monthFacts)).toContainEqual([
      "Rechnerisch verfügbar",
      "800,00 €",
    ]);
    expect(aiMonthRows(monthFacts)).toContainEqual(["Budgetrest", "−100,00 €"]);
    expect(
      aiMonthRows({
        ...monthFacts,
        available: null,
        budget: { status: "not_set" },
      }),
    ).toContainEqual(["Monatsbudget", "Nicht eingerichtet"]);
    expect(
      aiMonthFactsSchema.safeParse({
        ...monthFacts,
        income: "9007199254740992",
      }).success,
    ).toBe(false);
    expect(
      aiMonthFactsSchema.safeParse({ ...monthFacts, income: "1.25" }).success,
    ).toBe(false);
  });
  it("rejects fabricated numeric text and invented source links", () => {
    expect(aiExplanationSchema.safeParse(monthAnswer).success).toBe(true);
    for (const invalid of [
      { ...monthAnswer, paragraphs: ["Du hast 9999 Euro übrig."] },
      { ...monthAnswer, paragraphs: ["Stand ２０２６"] },
      { ...monthAnswer, paragraphs: [] },
      { ...monthAnswer, sources: ["https://example.com"] },
      { ...monthAnswer, sources: ["financial", "financial"] },
      { ...monthAnswer, tool: "delete_goal" },
    ])
      expect(aiExplanationSchema.safeParse(invalid).success).toBe(false);
    expect(aiMonthSources("2026-09").budget.href).toBe(
      "/account/money?month=2026-09#budget",
    );
    expect(() => aiMonthSources("javascript:alert(1)")).toThrow();
  });
});
