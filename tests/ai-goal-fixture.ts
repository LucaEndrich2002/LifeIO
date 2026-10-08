import type { AiGoalFacts, AiGoalExplanation } from "../src/domain/ai-goal";
export const goalId = "e5c6e3a0-2c6c-4fb2-9fb4-9e3a224a0133";
export const goalFacts: AiGoalFacts = {
  currency: "EUR",
  amount_unit: "minor",
  as_of: "2026-09-30",
  time_zone: "Europe/Berlin",
  target: "1000000",
  balance: "350000",
  remaining: "650000",
  deadline: "2027-01-01",
  projection_status: "projected",
  projected_date: "2027-10-31",
  next_contribution_date: "2026-10-31",
  contributions: 13,
  deadline_status: "late",
};
export const goalAnswer: AiGoalExplanation = {
  paragraphs: [
    "Nach deinem gespeicherten Sparplan erreichst du das Ziel nach deinem Zieldatum. Prüfe deine geplanten Beiträge.",
  ],
  sources: ["projection"],
};
