import { z } from "zod";
import { MAX_AMOUNT_MINOR, monthSchema } from "@/domain/money";
import {
  dateInZone,
  dateSchema,
  type MoneySnapshot,
} from "@/domain/transactions";
import { calendarDays } from "@/domain/calendar-time";
import { forecastGoal } from "@/domain/goal-forecast";
import { goalProgress } from "@/domain/goals";
import { milestoneProgress } from "@/domain/milestones";
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const amount = z.number().int().min(0).max(MAX_AMOUNT_MINOR);
const common = {
  id: z.uuid(),
  name: z.string(),
  deadline: dateSchema.nullable(),
  reached: z.boolean(),
  milestone_total: count,
  milestone_completed: count,
};
export const homeGoalSchema = z
  .discriminatedUnion("kind", [
    z.object({
      ...common,
      kind: z.literal("financial"),
      target_minor: amount.positive(),
      balance: z.string().regex(/^\d+$/).transform(Number).pipe(amount),
      rates: z
        .array(z.object({ month: dateSchema, amount_minor: amount }))
        .min(1),
    }),
    z.object({
      ...common,
      kind: z.literal("personal"),
      target_minor: z.null(),
      balance: z.null(),
      rates: z.array(z.never()).max(0),
    }),
  ])
  .refine((goal) => goal.milestone_completed <= goal.milestone_total);
export type HomeGoal = z.output<typeof homeGoalSchema>;
export const homeGoalsSchema = z
  .object({
    items: z.array(homeGoalSchema).max(6),
    total: count,
    overdue: count,
  })
  .refine(
    (data) => data.items.length <= data.total && data.overdue <= data.total,
  );
export const homeQuerySchema = z.object({
  month: monthSchema,
  goal_page: z.coerce.number().int().min(0).max(1000000).default(0),
  insight: z.enum(["month", "plan", "goals"]).optional(),
});
export type HomeSearch = {
  month?: string;
  goal_page?: string;
  insight?: string;
};
export type HomeQuery = z.output<typeof homeQuerySchema>;
export function homeInsightHref(query: HomeQuery) {
  const parsed = homeQuerySchema.parse(query);
  const params = new URLSearchParams({
    month: parsed.month,
    goal_page: String(parsed.goal_page),
  });
  if (parsed.insight) params.set("insight", parsed.insight);
  return `/account/home?${params.toString()}#home-ai`;
}
export function homePeriod(now: Date, zone: string, selectedMonth?: string) {
  const day = dateSchema.parse(dateInZone(now, zone));
  const month = monthSchema.parse(selectedMonth ?? day.slice(0, 7));
  const range = calendarDays({ view: "day", day, page: 0 }, zone)[0]!;
  return { day, month, range };
}
export function homeGoalStatus(goal: HomeGoal, today: string) {
  if (goal.kind === "financial") {
    const progress = goalProgress(goal.target_minor, goal.balance);
    const forecast = forecastGoal({
      targetMinor: goal.target_minor,
      balanceMinor: goal.balance,
      today,
      deadline: goal.deadline,
      rates: goal.rates,
    });
    return {
      progress: progress.progress,
      percent: progress.percent,
      reached: progress.reached,
      forecast,
    };
  }
  const progress = milestoneProgress(
    goal.milestone_total,
    goal.milestone_completed,
  );
  return {
    progress,
    percent: progress === null ? null : String(progress),
    reached:
      goal.milestone_total > 0 &&
      goal.milestone_completed === goal.milestone_total,
    forecast: null,
  };
}
export function budgetAttention(data: MoneySnapshot): "over" | "near" | null {
  if (!data.budget) return null;
  const spent = BigInt(data.totals.variable),
    limit = BigInt(data.budget.amount_minor);
  return spent > limit ? "over" : spent * 100n >= limit * 90n ? "near" : null;
}
