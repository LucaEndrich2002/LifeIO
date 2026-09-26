import { z } from "zod";
import { euroAmount, monthSchema, sumMinor } from "@/domain/money";

const name = z
  .string()
  .trim()
  .min(1, "Bitte gib eine Bezeichnung ein.")
  .max(80, "Höchstens 80 Zeichen.");
export const budgetInputSchema = z.object({
  name,
  amount: euroAmount(),
  month: monthSchema,
});
export const fixedInputSchema = z
  .object({
    name,
    amount: euroAmount(),
    month: monthSchema,
    end_month: z.union([z.literal(""), monthSchema]),
  })
  .refine((value) => !value.end_month || value.end_month >= value.month, {
    path: ["end_month"],
    message: "Der letzte Monat darf nicht vor dem ersten Monat liegen.",
  });
export const planMutationSchema = z.object({
  id: z.uuid(),
  new_id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "change", "end", "update", "delete"]),
  return_month: monthSchema,
});

export function nextMonth(month: string): string | null {
  monthSchema.parse(month);
  if (month === "2100-12") return null;
  const [year, part] = month.split("-").map(Number);
  return part === 12
    ? `${year! + 1}-01`
    : `${year}-${String(part! + 1).padStart(2, "0")}`;
}

export function budgetStatus(limit: number, spent: number) {
  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    !Number.isSafeInteger(spent) ||
    spent < 0
  )
    throw new Error("Invalid budget amounts.");
  // Rounded integer percentages via BigInt, including totals beyond multiplication's safe range.
  const percent = (BigInt(spent) * 100n + BigInt(limit) / 2n) / BigInt(limit);
  return {
    remaining: sumMinor([limit, -spent]),
    percent: percent.toString(),
    progress: Number(percent > 100n ? 100n : percent),
  };
}
