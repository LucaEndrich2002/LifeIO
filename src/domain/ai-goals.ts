import { z } from "zod";
import { MAX_AMOUNT_MINOR, formatEuro } from "@/domain/money";
import { dateSchema } from "@/domain/transactions";
import { profileSchema } from "@/domain/profile";
import { taskDateLabel } from "@/domain/tasks";
import { goalProjectionLabels } from "@/domain/ai-goal";
import {
  explanationParagraphs,
  type ExplanationState,
} from "@/domain/ai-explanation";

export const aiGoalsPageSchema = z.number().int().min(0).max(1000);
export const aiGoalLabels = ["A", "B", "C", "D", "E", "F"] as const;
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const minor = z
  .string()
  .regex(/^\d+$/)
  .refine((value) => Number(value) <= MAX_AMOUNT_MINOR);
const common = { label: z.enum(aiGoalLabels), deadline: dateSchema.nullable() };
const overviewGoalSchema = z.discriminatedUnion("kind", [
  z
    .strictObject({
      ...common,
      kind: z.literal("financial"),
      target: minor,
      balance: minor,
      remaining: minor,
      projection_status: z.enum([
        "reached",
        "projected",
        "unplanned",
        "beyond_range",
      ]),
      projected_date: dateSchema.nullable(),
      deadline_status: z
        .enum(["on_time", "late", "overdue", "unavailable"])
        .nullable(),
    })
    .refine((goal) => {
      if (
        ![goal.target, goal.balance, goal.remaining].every(
          (value) => minor.safeParse(value).success,
        )
      )
        return false;
      return (
        BigInt(goal.target) > 0n &&
        BigInt(goal.remaining) ===
          (BigInt(goal.target) > BigInt(goal.balance)
            ? BigInt(goal.target) - BigInt(goal.balance)
            : 0n) &&
        (goal.projection_status === "projected") ===
          (goal.projected_date !== null) &&
        (goal.projection_status === "reached") ===
          (BigInt(goal.remaining) === 0n)
      );
    }),
  z
    .strictObject({
      ...common,
      kind: z.literal("personal"),
      milestones: count,
      completed: count,
    })
    .refine((goal) => goal.completed <= goal.milestones),
]);
export type AiOverviewGoal = z.output<typeof overviewGoalSchema>;
export const aiGoalsFactsSchema = z
  .strictObject({
    as_of: dateSchema,
    time_zone: profileSchema.shape.time_zone,
    currency: z.literal("EUR"),
    amount_unit: z.literal("minor"),
    page: aiGoalsPageSchema,
    total: count,
    goals: z.array(overviewGoalSchema).max(6),
  })
  .refine(
    (facts) =>
      facts.goals.length ===
        Math.min(6, Math.max(0, facts.total - facts.page * 6)) &&
      facts.goals.every(
        (goal, index) =>
          goal.label === aiGoalLabels[index] &&
          (goal.kind !== "financial" ||
            goal.deadline_status ===
              (!goal.deadline || goal.projection_status === "reached"
                ? null
                : goal.deadline < facts.as_of
                  ? "overdue"
                  : goal.projected_date === null
                    ? "unavailable"
                    : goal.projected_date > goal.deadline
                      ? "late"
                      : "on_time")),
      ),
  );
export type AiGoalsFacts = z.output<typeof aiGoalsFactsSchema>;
export const aiGoalsQuestionSchema = z.strictObject({
  page: z.coerce.number().pipe(aiGoalsPageSchema),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  question: z.string().trim().max(600),
  consent: z.literal("yes"),
});
export const aiGoalsExplanationSchema = z.strictObject({
  paragraphs: explanationParagraphs,
  sources: z.tuple([z.literal("goals")]),
});
export type AiGoalsAnswerState = ExplanationState<
  AiGoalsFacts,
  z.output<typeof aiGoalsExplanationSchema>
>;
export function aiGoalsHref(page: number) {
  return `/account/ai/goals?page=${aiGoalsPageSchema.parse(page)}`;
}
export function aiGoalsSource(page: number) {
  return {
    label: "Ziele und Fortschritt",
    href: `/account/home?goal_page=${aiGoalsPageSchema.parse(page)}#home-goals`,
  };
}

export const aiGoalAssessmentLabels = {
  reached: "Ziel erreicht; früherer Abschlusszeitpunkt nicht abgeleitet",
  overdue: "Zieldatum überschritten; Ziel noch nicht als erreicht belegt",
  late: "Nach diesem Sparplan nach dem Zieldatum",
  on_time: "Nach diesem Sparplan rechtzeitig",
  unknown: "Einhaltung des Zieldatums noch nicht einschätzbar",
  no_deadline: "Kein Zieldatum angegeben",
} as const;
export function aiGoalAssessment(
  goal: AiOverviewGoal,
  today: string,
): keyof typeof aiGoalAssessmentLabels {
  dateSchema.parse(today);
  if (goal.kind === "financial") {
    if (goal.projection_status === "reached") return "reached";
    return goal.deadline_status === "unavailable"
      ? "unknown"
      : (goal.deadline_status ?? "no_deadline");
  }
  if (goal.milestones > 0 && goal.completed === goal.milestones)
    return "reached";
  if (!goal.deadline) return "no_deadline";
  return goal.deadline < today ? "overdue" : "unknown";
}
export function aiOverviewGoalRows(goal: AiOverviewGoal) {
  const rows: [string, string][] = [
    [
      "Zieldatum",
      goal.deadline ? taskDateLabel(goal.deadline) : "Nicht angegeben",
    ],
  ];
  if (goal.kind === "personal")
    return [
      ...rows,
      ["Meilensteine erledigt", `${goal.completed} von ${goal.milestones}`],
      [
        "Fortschrittsgrundlage",
        goal.milestones
          ? "Erfasste Meilensteine; keine Zeitprognose"
          : "Noch keine Meilensteine; Fortschritt offen",
      ],
    ] as [string, string][];
  return [
    ...rows,
    ["Zielbetrag", formatEuro(Number(goal.target))],
    ["Tatsächlich angespart", formatEuro(Number(goal.balance))],
    ["Noch offen", formatEuro(Number(goal.remaining))],
    ["Prognose", goalProjectionLabels[goal.projection_status]],
    [
      "Voraussichtlich erreicht",
      goal.projected_date
        ? taskDateLabel(goal.projected_date)
        : "Kein zukünftiges Datum berechnet",
    ],
  ] as [string, string][];
}
