import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
import { dateInZone, dateSchema } from "@/domain/transactions";
import { profileSchema } from "@/domain/profile";
import { taskInputSchema, taskListHref, taskWeek } from "@/domain/tasks";
import { calendarInputSchema, calendarHref } from "@/domain/calendar";
import {
  explanationParagraphs,
  type ExplanationState,
} from "@/domain/ai-explanation";

export function aiPlanPeriod(now: Date, zone: string) {
  const as_of = dateInZone(now, zone);
  const week = taskWeek(as_of);
  return {
    as_of,
    week_start: week.start,
    week_end: week.end,
    event_days: 8 - Temporal.PlainDate.from(as_of).dayOfWeek,
  };
}
const total = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const aiPlanFactsSchema = z
  .strictObject({
    as_of: dateSchema,
    week_start: z.iso.date(),
    week_end: z.iso.date(),
    time_zone: profileSchema.shape.time_zone,
    tasks_total: total,
    events_total: total,
    tasks: z
      .array(
        z.strictObject({
          title: taskInputSchema.shape.title,
          priority: taskInputSchema.shape.priority,
          due_on: dateSchema,
          overdue: z.boolean(),
        }),
      )
      .max(25),
    events: z
      .array(
        z
          .strictObject({
            title: calendarInputSchema.shape.title,
            starts_at: z.iso.datetime({ offset: true }),
            ends_at: z.iso.datetime({ offset: true }),
            ongoing: z.boolean(),
          })
          .refine(
            (event) => new Date(event.starts_at) < new Date(event.ends_at),
          ),
      )
      .max(25),
  })
  .refine((facts) => {
    const week = taskWeek(facts.as_of);
    return (
      facts.week_start === week.start &&
      facts.week_end === week.end &&
      facts.tasks.length === Math.min(25, facts.tasks_total) &&
      facts.events.length === Math.min(25, facts.events_total) &&
      facts.tasks.every(
        (task) =>
          task.due_on >= week.start &&
          task.due_on <= week.end &&
          task.overdue === task.due_on < facts.as_of,
      )
    );
  });
export type AiPlanFacts = z.output<typeof aiPlanFactsSchema>;
export const aiPlanQuestionSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  question: z.string().trim().max(600),
  consent: z.literal("yes"),
});
export const aiPlanExplanationSchema = z.strictObject({
  paragraphs: explanationParagraphs,
  sources: z
    .array(z.enum(["tasks", "events"]))
    .min(1)
    .max(2)
    .refine((sources) => new Set(sources).size === sources.length),
});
export type AiPlanAnswerState = ExplanationState<
  AiPlanFacts,
  z.output<typeof aiPlanExplanationSchema>
>;
export function aiPlanSources(day: string) {
  dateSchema.parse(day);
  return {
    tasks: {
      label: "Aufgaben dieser Woche",
      href: taskListHref({ day, view: "week", status: "open", page: 0 }),
    },
    events: {
      label: "Kalender dieser Woche",
      href: calendarHref({ day, view: "week", page: 0 }),
    },
  };
}
