import { z } from "zod";
import { euroAmount, MAX_AMOUNT_MINOR, monthSchema } from "@/domain/money";
import { dateSchema } from "@/domain/transactions";

export const goalInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Namen ein.")
    .max(80, "Höchstens 80 Zeichen."),
  target: euroAmount(),
  opening: euroAmount(true),
  monthly: euroAmount(true),
  month: monthSchema,
  deadline: z.union([z.literal(""), dateSchema]),
});
export const contributionInputSchema = z.object({
  amount: euroAmount(),
  date: dateSchema,
  note: z.string().trim().max(80, "Höchstens 80 Zeichen."),
});
export const goalMutationSchema = z.object({
  id: z.uuid(),
  entry_id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "update", "contribute", "cancel"]),
});
const amount = z.number().int().min(0).max(MAX_AMOUNT_MINOR);
export const goalSnapshotSchema = z.object({
  goal: z.object({
    id: z.uuid(),
    name: z.string(),
    target_minor: amount.positive(),
    current_minor: amount,
    monthly_minor: amount,
    deadline: z.string().nullable(),
    revision: z.number().int().nonnegative(),
  }),
  balance: z.string().regex(/^\d+$/).transform(Number).pipe(amount),
  rates: z.array(z.object({ month: z.string(), amount_minor: amount })).min(1),
  entries: z.array(
    z.object({
      id: z.uuid(),
      amount_minor: amount.positive(),
      paid_on: z.string(),
      note: z.string(),
      cancelled_at: z.string().nullable(),
    }),
  ),
  count: z.number().int().nonnegative(),
});
export type GoalSnapshot = z.infer<typeof goalSnapshotSchema>;

export function goalProgress(target: number, balance: number) {
  if (
    !Number.isSafeInteger(target) ||
    target <= 0 ||
    !Number.isSafeInteger(balance) ||
    balance < 0
  )
    throw new Error("Invalid goal amounts.");
  const percent =
    (BigInt(balance) * 100n + BigInt(target) / 2n) / BigInt(target);
  return {
    percent: percent.toString(),
    progress: Number(percent > 100n ? 100n : percent),
    reached: balance >= target,
  };
}
