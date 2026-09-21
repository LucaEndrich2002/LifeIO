import { z } from "zod";
import { euroAmount, monthSchema, sumMinor } from "@/domain/money";

export const categories = {
  groceries: "Lebensmittel",
  mobility: "Mobilität",
  health: "Gesundheit",
  leisure: "Freizeit",
  shopping: "Einkäufe",
  other: "Sonstiges",
} as const;
export const categorySchema = z.enum([
  "groceries",
  "mobility",
  "health",
  "leisure",
  "shopping",
  "other",
]);
export const transactionKindSchema = z.enum(["income", "expense"]);
export type TransactionKind = z.infer<typeof transactionKindSchema>;
export const dateSchema = z
  .string()
  .regex(
    /^(20\d{2}|2100)-(0[1-9]|1[0-2])-\d{2}$/,
    "Bitte wähle ein gültiges Datum zwischen 2000 und 2100.",
  )
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Bitte wähle ein gültiges Kalenderdatum.");
const name = z
  .string()
  .trim()
  .min(1, "Bitte gib eine Bezeichnung ein.")
  .max(80, "Höchstens 80 Zeichen.");
export const incomeInputSchema = z.object({
  name,
  amount: euroAmount(),
  month: monthSchema,
});
export const expenseInputSchema = z.object({
  name,
  amount: euroAmount(),
  spent_on: dateSchema,
  category: categorySchema,
});
export const mutationSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "update", "delete"]),
});
export function dateInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}

// Aggregate totals arrive as decimal integer strings, never lossy JSON numbers.
const totalSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isSafeInteger);
const rowBase = {
  id: z.uuid(),
  name: z.string(),
  amount_minor: z.number().int().positive().max(99999999999),
  revision: z.number().int().nonnegative(),
};
export const incomeRowSchema = z.object({ ...rowBase, month: z.string() });
export const expenseRowSchema = z.object({
  ...rowBase,
  spent_on: z.string(),
  category: categorySchema,
});
export const moneySnapshotSchema = z.object({
  incomes: z.array(incomeRowSchema),
  expenses: z.array(expenseRowSchema),
  fixed: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      amount_minor: rowBase.amount_minor,
      start_month: z.string(),
    }),
  ),
  totals: z.object({
    income: totalSchema,
    variable: totalSchema,
    fixed: totalSchema,
    savings: totalSchema,
    income_count: z.number().int().nonnegative(),
    expense_count: z.number().int().nonnegative(),
  }),
});
export type MoneySnapshot = z.infer<typeof moneySnapshotSchema>;
export function availableMinor(totals: MoneySnapshot["totals"]): number {
  return sumMinor([
    totals.income,
    -totals.fixed,
    -totals.variable,
    -totals.savings,
  ]);
}
