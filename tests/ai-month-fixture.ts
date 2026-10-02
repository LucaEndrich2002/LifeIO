import type { AiMonthFacts } from "../src/domain/ai-month";
export const monthFacts: AiMonthFacts = {
  currency: "EUR",
  amount_unit: "minor",
  month: "2026-09",
  time_zone: "Europe/Berlin",
  income: "280000",
  fixed: "90000",
  variable: "60000",
  savings: "50000",
  available: "80000",
  income_count: 1,
  expense_count: 1,
  missing: [],
  budget: {
    status: "set",
    limit: "50000",
    spent: "60000",
    remaining: "-10000",
    percent: "120",
    attention: "over",
  },
};
export const monthAnswer = {
  paragraphs: [
    "Dein Monatsbudget ist überschritten. Prüfe deine variablen Ausgaben anhand der Übersicht.",
  ],
  sources: ["financial", "budget"] as ("financial" | "budget")[],
};
