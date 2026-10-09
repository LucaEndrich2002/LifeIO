import type { AiPlanFacts } from "../src/domain/ai-plan";
export const planFacts: AiPlanFacts = {
  as_of: "2026-10-08",
  week_start: "2026-10-05",
  week_end: "2026-10-11",
  time_zone: "Europe/Berlin",
  tasks_total: 1,
  events_total: 1,
  tasks: [
    {
      title: "Unterlagen vorbereiten",
      priority: "high",
      due_on: "2026-10-07",
      overdue: true,
    },
  ],
  events: [
    {
      title: "Besprechung",
      starts_at: "2026-10-08T13:00:00Z",
      ends_at: "2026-10-08T14:00:00Z",
      ongoing: false,
    },
  ],
};
export const planAnswer = {
  paragraphs: [
    "Prüfe zuerst die überfällige Aufgabe und die Vorbereitung auf deinen Termin.",
  ],
  sources: ["tasks", "events"] as ("tasks" | "events")[],
};
