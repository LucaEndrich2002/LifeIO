import { z } from "zod";
import { MAX_AMOUNT_MINOR, monthSchema } from "@/domain/money";
import { goalKindSchema } from "@/domain/personal-goals";

export const linkPageSchema = z.coerce.number().int().min(0).max(1000000);
export const goalBudgetMutationSchema = z.object({
  id: z.uuid(),
  goal_id: z.uuid(),
  budget_id: z.uuid(),
  operation: z.enum(["create", "remove"]),
  return_page: linkPageSchema.default(0),
});
export const linkedBudgetSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/)
    .refine((value) => monthSchema.safeParse(value.slice(0, 7)).success),
  amount_minor: z.number().int().min(1).max(MAX_AMOUNT_MINOR),
  currency: z.literal("EUR"),
});
export const linkedGoalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: goalKindSchema,
});
export const goalBudgetPageSchema = z
  .object({
    items: z
      .array(z.object({ id: z.uuid(), budget: linkedBudgetSchema }))
      .max(25),
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.count);
export const budgetGoalPageSchema = z
  .object({
    items: z.array(z.object({ id: z.uuid(), goal: linkedGoalSchema })).max(25),
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.count);
