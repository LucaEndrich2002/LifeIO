import { z } from "zod";
import { MAX_AMOUNT_MINOR, formatEuro } from "@/domain/money";
import { dateSchema } from "@/domain/transactions";
import {
  explanationParagraphs,
  type ExplanationState,
} from "@/domain/ai-explanation";

const minor = z
  .string()
  .regex(/^\d+$/)
  .refine((value) => Number(value) <= MAX_AMOUNT_MINOR);
export const aiGoalFactsSchema = z
  .strictObject({
    currency: z.literal("EUR"),
    amount_unit: z.literal("minor"),
    as_of: dateSchema,
    time_zone: z.string(),
    target: minor,
    balance: minor,
    remaining: minor,
    deadline: dateSchema.nullable(),
    projection_status: z.enum([
      "reached",
      "projected",
      "unplanned",
      "beyond_range",
    ]),
    projected_date: dateSchema.nullable(),
    next_contribution_date: dateSchema.nullable(),
    contributions: z.number().int().nonnegative().nullable(),
    deadline_status: z
      .enum(["on_time", "late", "overdue", "unavailable"])
      .nullable(),
  })
  .refine((facts) => {
    if (facts.projection_status === "projected")
      return (
        !!facts.projected_date &&
        !!facts.next_contribution_date &&
        !!facts.contributions
      );
    return (
      facts.projected_date === null &&
      facts.next_contribution_date === null &&
      facts.contributions === (facts.projection_status === "reached" ? 0 : null)
    );
  });
export type AiGoalFacts = z.output<typeof aiGoalFactsSchema>;
export const aiGoalQuestionSchema = z.strictObject({
  goal_id: z.uuid(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  question: z.string().trim().max(600),
  consent: z.literal("yes"),
});
export const aiGoalExplanationSchema = z.strictObject({
  paragraphs: explanationParagraphs,
  sources: z.tuple([z.literal("projection")]),
});
export type AiGoalExplanation = z.output<typeof aiGoalExplanationSchema>;
export type AiGoalAnswerState = ExplanationState<
  AiGoalFacts,
  AiGoalExplanation
>;
export function aiGoalSource(id: string) {
  return {
    label: "Sparziel und Prognose",
    href: `/account/goals/${z.uuid().parse(id)}`,
  };
}
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
export const goalProjectionLabels = {
  reached: "Bereits angespart",
  projected: "Erreichungsdatum berechenbar",
  unplanned: "Mit den geplanten Sparraten noch nicht berechenbar",
  beyond_range: "Mit diesem Plan bis Ende 2100 nicht erreicht",
};
export const goalDeadlineLabels = {
  on_time: "Nach diesem Plan rechtzeitig",
  late: "Nach diesem Plan nach dem Zieldatum",
  overdue: "Zieldatum überschritten, Zielbetrag noch nicht erreicht",
  unavailable: "Einhaltung des Zieldatums noch nicht bestimmbar",
};
export function aiGoalRows(facts: AiGoalFacts) {
  return [
    ["Stand", dateLabel(facts.as_of)],
    ["Zielbetrag", formatEuro(Number(facts.target))],
    ["Tatsächlich angespart", formatEuro(Number(facts.balance))],
    ["Noch offen", formatEuro(Number(facts.remaining))],
    [
      "Dein Zieldatum",
      facts.deadline ? dateLabel(facts.deadline) : "Nicht angegeben",
    ],
    ["Prognose", goalProjectionLabels[facts.projection_status]],
    [
      "Voraussichtlich erreicht",
      facts.projected_date
        ? dateLabel(facts.projected_date)
        : "Kein zukünftiges Datum berechnet",
    ],
    [
      "Nächster angenommener Beitrag",
      facts.next_contribution_date
        ? dateLabel(facts.next_contribution_date)
        : "Keiner berechnet",
    ],
    [
      "Noch benötigte Beiträge",
      facts.contributions === null
        ? "Noch nicht bestimmbar"
        : String(facts.contributions),
    ],
    [
      "Terminvergleich",
      facts.deadline_status
        ? goalDeadlineLabels[facts.deadline_status]
        : facts.projection_status === "reached"
          ? "Ziel bereits erreicht; kein früheres Erreichungsdatum abgeleitet"
          : "Kein Zieldatum angegeben",
    ],
  ];
}
