import { z } from "zod";
import { monthSchema, formatEuro } from "@/domain/money";
import {
  explanationParagraphs,
  type ExplanationState,
} from "@/domain/ai-explanation";

const minor = z
  .string()
  .regex(/^-?\d+$/)
  .refine((value) => Number.isSafeInteger(Number(value)));
export const aiMonthFactsSchema = z.strictObject({
  currency: z.literal("EUR"),
  amount_unit: z.literal("minor"),
  month: monthSchema,
  time_zone: z.string(),
  income: minor,
  fixed: minor.nullable(),
  variable: minor,
  savings: minor,
  available: minor.nullable(),
  income_count: z.number().int().nonnegative(),
  expense_count: z.number().int().nonnegative(),
  missing: z.array(z.enum(["income", "fixed_costs"])),
  budget: z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("not_set") }),
    z.strictObject({
      status: z.literal("set"),
      limit: minor,
      spent: minor,
      remaining: minor,
      percent: z.string().regex(/^\d+$/),
      attention: z.enum(["near", "over"]).nullable(),
    }),
  ]),
});
export type AiMonthFacts = z.output<typeof aiMonthFactsSchema>;
export const aiQuestionSchema = z.strictObject({
  month: monthSchema,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  question: z.string().trim().max(600),
  consent: z.literal("yes"),
});
export const aiExplanationSchema = z.strictObject({
  paragraphs: explanationParagraphs,
  sources: z
    .array(z.enum(["financial", "budget"]))
    .min(1)
    .max(2)
    .refine((items) => new Set(items).size === items.length),
});
export type AiExplanation = z.output<typeof aiExplanationSchema>;
export function aiMonthRows(facts: AiMonthFacts) {
  const euro = (amount: string | null) =>
    amount === null ? "Noch nicht bestimmbar" : formatEuro(Number(amount));
  return [
    ["Einnahmen", euro(facts.income)],
    ["Fixkosten", euro(facts.fixed)],
    ["Variable Ausgaben", euro(facts.variable)],
    ["Geplantes Sparen", euro(facts.savings)],
    ["Rechnerisch verfügbar", euro(facts.available)],
    [
      "Monatsbudget",
      facts.budget.status === "set"
        ? euro(facts.budget.limit)
        : "Nicht eingerichtet",
    ],
    ...(facts.budget.status === "set"
      ? [
          ["Budgetrest", euro(facts.budget.remaining)],
          ["Budgetnutzung (gerundet)", `${facts.budget.percent} %`],
        ]
      : []),
  ];
}
export function aiMonthSources(month: string) {
  const valid = monthSchema.parse(month);
  return {
    financial: {
      label: "Monatsübersicht",
      href: `/account/money?month=${valid}`,
    },
    budget: {
      label: "Monatsbudget",
      href: `/account/money?month=${valid}#budget`,
    },
  };
}
export type AiAnswerState = ExplanationState<AiMonthFacts, AiExplanation>;
