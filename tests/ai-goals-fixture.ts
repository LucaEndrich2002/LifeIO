import type { AiGoalsFacts } from "../src/domain/ai-goals";
export const goalsFacts: AiGoalsFacts = {
  as_of: "2026-10-09",
  time_zone: "Europe/Berlin",
  currency: "EUR",
  amount_unit: "minor",
  page: 0,
  total: 2,
  goals: [
    {
      label: "A",
      kind: "financial",
      target: "100000",
      balance: "25000",
      remaining: "75000",
      deadline: "2026-11-30",
      projection_status: "projected",
      projected_date: "2027-01-31",
      deadline_status: "late",
    },
    {
      label: "B",
      kind: "personal",
      deadline: "2026-12-31",
      milestones: 0,
      completed: 0,
    },
  ],
};
export const goalsNames = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Reise" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Sprache lernen" },
];
export const goalsAnswer = {
  paragraphs: [
    "Prüfe bei Ziel A den Sparplan und das Zieldatum. Bei Ziel B fehlt eine Grundlage für die zeitliche Einordnung.",
  ],
  sources: ["goals"] as ["goals"],
};
