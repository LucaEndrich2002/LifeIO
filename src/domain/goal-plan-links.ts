import { z } from "zod";
import { linkPageSchema, linkedGoalSchema } from "@/domain/goal-budget-links";
import { taskSchema } from "@/domain/tasks";
import { calendarEventSchema } from "@/domain/calendar";
export const planKindSchema = z.enum(["task", "event"]);
export type PlanKind = z.output<typeof planKindSchema>;
export const planKindLabel = { task: "Aufgabe", event: "Termin" } as const;
export const planRelationship = {
  task: "requires",
  event: "scheduled_as",
} as const;
export const planLinksQuerySchema = z.object({
  kind: planKindSchema.default("task"),
  mode: z.enum(["linked", "choose"]).default("linked"),
  page: linkPageSchema.default(0),
});
export type PlanLinksSearch = { kind?: string; mode?: string; page?: string };
export const goalPlanMutationSchema = z.object({
  id: z.uuid(),
  goal_id: z.uuid(),
  target_id: z.uuid(),
  kind: planKindSchema,
  operation: z.enum(["create", "remove"]),
  from: z.enum(["goal", "target"]).default("goal"),
  return_page: linkPageSchema.default(0),
});
export const planTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("task"), item: taskSchema }),
  z.object({ kind: z.literal("event"), item: calendarEventSchema }),
]);
export type PlanTarget = z.output<typeof planTargetSchema>;
export const planLinksPageSchema = z
  .object({
    items: z
      .array(
        z.object({ link_id: z.uuid().optional(), target: planTargetSchema }),
      )
      .max(25),
    count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.count);
export const planGoalsPageSchema = z
  .object({
    items: z.array(z.object({ id: z.uuid(), goal: linkedGoalSchema })).max(25),
    count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })
  .refine((value) => value.items.length <= value.count);
export function planTargetHref(kind: PlanKind, id: string) {
  planKindSchema.parse(kind);
  z.uuid().parse(id);
  return `/account/plan/${kind === "event" ? "calendar/" : ""}${id}`;
}
export function goalPlanHref(
  goal: string,
  kind: PlanKind,
  page = 0,
  mode: "linked" | "choose" = "linked",
) {
  z.uuid().parse(goal);
  const query = planLinksQuerySchema.parse({ kind, page, mode });
  return `/account/goals/${goal}/plan?${new URLSearchParams({ kind: query.kind, mode: query.mode, page: String(query.page) })}`;
}
export function goalPlanReturn(input: z.output<typeof goalPlanMutationSchema>) {
  const valid = goalPlanMutationSchema.parse(input);
  return valid.from === "target"
    ? `${planTargetHref(valid.kind, valid.target_id)}/goals?page=${valid.return_page}`
    : goalPlanHref(
        valid.goal_id,
        valid.kind,
        valid.operation === "create" ? 0 : valid.return_page,
      );
}
