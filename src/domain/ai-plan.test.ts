import { describe, expect, it } from "vitest";
import {
  aiPlanFactsSchema,
  aiPlanQuestionSchema,
  aiPlanExplanationSchema,
  aiPlanPeriod,
  aiPlanSources,
} from "./ai-plan";
import { planFacts, planAnswer } from "../../tests/ai-plan-fixture";
import { aiEventRange } from "./ai-event-range";

describe("weekly planning explanation", () => {
  it("anchors Monday weeks and remaining event days to the profile zone across year and DST boundaries", () => {
    expect(
      aiPlanPeriod(new Date("2026-12-31T23:30:00Z"), "Europe/Berlin"),
    ).toEqual({
      as_of: "2027-01-01",
      week_start: "2026-12-28",
      week_end: "2027-01-03",
      event_days: 3,
    });
    const now = new Date("2026-10-25T00:30:00Z");
    const berlin = aiPlanPeriod(now, "Europe/Berlin");
    const west = aiPlanPeriod(now, "America/Los_Angeles");
    expect(berlin.event_days).toBe(1);
    expect(west.as_of).toBe("2026-10-24");
    expect(west.event_days).toBe(2);
    expect(
      aiEventRange(berlin.as_of, berlin.event_days, "Europe/Berlin", now),
    ).toEqual({ start: "2026-10-25T00:30:00Z", end: "2026-10-25T23:00:00Z" });
    expect(
      aiPlanPeriod(new Date("2026-10-25T23:00:00Z"), "Europe/Berlin"),
    ).toMatchObject({ week_start: "2026-10-26", event_days: 7 });
  });
  it("rejects invalid coverage, week dates, overdue flags and extra data", () => {
    expect(aiPlanFactsSchema.parse(planFacts)).toEqual(planFacts);
    expect(
      aiPlanFactsSchema.safeParse({
        ...planFacts,
        as_of: "2000-01-01",
        week_start: "1999-12-27",
        week_end: "2000-01-02",
        tasks: [],
        tasks_total: 0,
        events: [],
        events_total: 0,
      }).success,
    ).toBe(true);
    for (const facts of [
      { ...planFacts, tasks_total: 2 },
      { ...planFacts, week_end: "2026-10-12" },
      { ...planFacts, tasks: [{ ...planFacts.tasks[0], overdue: false }] },
      {
        ...planFacts,
        tasks: [{ ...planFacts.tasks[0], due_on: "2026-10-04" }],
      },
      { ...planFacts, user_id: "secret" },
      {
        ...planFacts,
        events: [{ ...planFacts.events[0], ends_at: "2026-10-08T12:00:00Z" }],
      },
    ])
      expect(aiPlanFactsSchema.safeParse(facts).success).toBe(false);
  });
  it("requires explicit consent, fixed source keys and no tool arguments or numbers in answers", () => {
    const input = { fingerprint: "f".repeat(64), question: "", consent: "yes" };
    expect(aiPlanQuestionSchema.safeParse(input).success).toBe(true);
    for (const invalid of [
      { ...input, consent: "no" },
      { ...input, user_id: "other" },
      { ...input, day: "2026-10-08" },
      { ...input, question: "x".repeat(601) },
    ])
      expect(aiPlanQuestionSchema.safeParse(invalid).success).toBe(false);
    expect(aiPlanExplanationSchema.safeParse(planAnswer).success).toBe(true);
    for (const answer of [
      { ...planAnswer, sources: ["financial"] },
      { ...planAnswer, sources: ["tasks", "tasks"] },
      { ...planAnswer, paragraphs: ["Du hast 3 freie Stunden."] },
    ])
      expect(aiPlanExplanationSchema.safeParse(answer).success).toBe(false);
    expect(aiPlanSources(planFacts.as_of).events.href).toContain("view=week");
    expect(() => aiPlanSources("https://attacker.test")).toThrow();
  });
});
