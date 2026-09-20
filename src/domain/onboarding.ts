import { z } from "zod";
import { euroAmount, monthSchema } from "@/domain/money";

export const onboardingSteps = [
  "income",
  "expenses",
  "goal",
  "review",
] as const;
export const stepSchema = z.enum(onboardingSteps);
export type OnboardingStep = z.infer<typeof stepSchema>;
const name = z
  .string()
  .trim()
  .min(1, "Bitte gib eine Bezeichnung ein.")
  .max(80, "Bitte verwende höchstens 80 Zeichen.");
const positive = euroAmount();
const nonnegative = euroAmount(true);

export const incomeSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("skipped"), month: monthSchema }),
  z.object({
    decision: z.literal("saved"),
    month: monthSchema,
    name,
    amount: positive,
  }),
]);
export const expensesSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("skipped") }),
  z.object({
    decision: z.literal("saved"),
    items: z
      .array(z.object({ name, amount: positive }))
      .min(
        1,
        "Bitte erfasse mindestens eine Fixkostenposition oder lasse diesen Schritt aus.",
      )
      .max(20, "Maximal 20 Fixkostenpositionen in der Einrichtung."),
  }),
]);
export const goalSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("skipped") }),
  z.object({
    decision: z.literal("saved"),
    name,
    target: positive,
    current: nonnegative,
    monthly: nonnegative,
  }),
]);
export const revisionSchema = z.coerce.number().int().min(0).max(2_147_483_646);

export function nextStep(
  state: {
    income_status: string;
    expenses_status: string;
    goal_status: string;
  } | null,
): OnboardingStep {
  if (!state || state.income_status === "pending") return "income";
  if (state.expenses_status === "pending") return "expenses";
  if (state.goal_status === "pending") return "goal";
  return "review";
}
