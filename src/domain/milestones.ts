import { z } from "zod";

export const milestoneTitleSchema = z
  .string()
  .trim()
  .min(1, "Bitte gib einen Namen ein.")
  .refine((value) => [...value].length <= 80, "Höchstens 80 Zeichen.");
export const milestonePageSchema = z.coerce.number().int().min(0).max(1000000);
export const milestoneMutationSchema = z.object({
  goal_id: z.uuid(),
  id: z.uuid(),
  revision: z.coerce.number().int().min(0).max(2147483646),
  operation: z.enum(["create", "rename", "complete", "reopen", "remove"]),
  return_page: milestonePageSchema.default(0),
});
export const milestoneSnapshotSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        title: milestoneTitleSchema,
        revision: z.number().int().nonnegative(),
        completed_at: z.string().nullable(),
      }),
    ),
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    completed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .refine(
    ({ total, completed, items }) =>
      completed <= total && items.length <= Math.min(25, total),
  );

export function milestoneProgress(
  total: number,
  completed: number,
): number | null {
  if (
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(completed) ||
    completed < 0 ||
    total < completed
  )
    throw new Error("Invalid milestone counts.");
  if (total === 0) return null;
  return Number(
    (BigInt(completed) * 100n + BigInt(total) / 2n) / BigInt(total),
  );
}
