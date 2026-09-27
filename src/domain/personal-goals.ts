import { z } from "zod";
import { dateSchema } from "@/domain/transactions";

export const goalKindSchema = z.enum(["financial", "personal"]);
export const personalGoalInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Namen ein.")
    .refine((value) => [...value].length <= 80, "Höchstens 80 Zeichen."),
  deadline: z.union([z.literal(""), dateSchema]),
});
export const personalGoalMutationSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "update"]),
});
export const personalGoalSchema = z.object({
  id: z.uuid(),
  kind: z.literal("personal"),
  name: personalGoalInputSchema.shape.name,
  deadline: dateSchema.nullable(),
  revision: z.number().int().nonnegative(),
});

// A deadline is a calendar day, never a UTC instant that can shift time zones.
export function personalDeadlineLabel(deadline: string | null) {
  if (deadline === null) return "Kein Zieldatum festgelegt";
  const [year, month, day] = dateSchema.parse(deadline).split("-");
  return `Zieldatum: ${day}.${month}.${year}`;
}
