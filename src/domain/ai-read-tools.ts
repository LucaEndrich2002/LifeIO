import { z } from "zod";
import { monthSchema } from "@/domain/money";
import {
  dateSchema,
  availableMinor,
  type MoneySnapshot,
} from "@/domain/transactions";
import { budgetStatus } from "@/domain/plans";
import { budgetAttention } from "@/domain/home";

export const aiReadToolNames = [
  "get_financial_summary",
  "get_budget_status",
  "get_goals",
  "get_goal_projection",
  "get_tasks",
  "get_upcoming_events",
] as const;
export const aiReadToolNameSchema = z.enum(aiReadToolNames);
export type AiReadToolName = z.output<typeof aiReadToolNameSchema>;
const page = z.number().int().min(0).max(1000).default(0);
// Strict envelopes and strict arguments: a tool cannot request another owner,
// arbitrary columns/SQL, additional permissions, or an outbound destination.
export const aiReadRequestSchema = z.discriminatedUnion("name", [
  z.strictObject({
    name: z.literal("get_financial_summary"),
    arguments: z.strictObject({ month: monthSchema }),
  }),
  z.strictObject({
    name: z.literal("get_budget_status"),
    arguments: z.strictObject({ month: monthSchema }),
  }),
  z.strictObject({
    name: z.literal("get_goals"),
    arguments: z.strictObject({ page }),
  }),
  z.strictObject({
    name: z.literal("get_goal_projection"),
    arguments: z.strictObject({ goal_id: z.uuid() }),
  }),
  z.strictObject({
    name: z.literal("get_tasks"),
    arguments: z.strictObject({
      day: dateSchema,
      view: z.enum(["day", "week", "undated"]),
      page,
    }),
  }),
  z.strictObject({
    name: z.literal("get_upcoming_events"),
    arguments: z.strictObject({
      day: dateSchema,
      days: z.number().int().min(1).max(7),
      page,
    }),
  }),
]);
export type AiReadRequest = z.output<typeof aiReadRequestSchema>;
export const aiReadGrantSchema = z
  .array(aiReadToolNameSchema)
  .max(6)
  .refine((names) => new Set(names).size === names.length);
export function aiPage(page: number, size: number, total: number) {
  return { page, page_size: size, total, has_more: (page + 1) * size < total };
}
// All amounts crossing the tool boundary are decimal INTEGER strings in cents.
// No transaction names, notes, IDs, profile fields or payment history are needed.
export function aiFinancialFacts(data: MoneySnapshot) {
  const missing = [
    ...(data.totals.income_count ? [] : ["income"]),
    ...(data.fixed_known ? [] : ["fixed_costs"]),
  ];
  return {
    currency: "EUR" as const,
    amount_unit: "minor" as const,
    income_minor: String(data.totals.income),
    fixed_minor: data.fixed_known ? String(data.totals.fixed) : null,
    variable_minor: String(data.totals.variable),
    planned_savings_minor: String(data.totals.savings),
    available_minor: missing.length
      ? null
      : String(availableMinor(data.totals)),
    missing_basis: missing,
    income_count: data.totals.income_count,
    expense_count: data.totals.expense_count,
    basis:
      "Saved monthly income minus fixed costs, variable expenses and planned savings. A plan, not a bank balance. Missing records can change it.",
  };
}
export function aiBudgetFacts(data: MoneySnapshot) {
  if (!data.budget)
    return {
      status: "not_set" as const,
      currency: "EUR" as const,
      amount_unit: "minor" as const,
    };
  const status = budgetStatus(data.budget.amount_minor, data.totals.variable);
  return {
    status: "set" as const,
    currency: "EUR" as const,
    amount_unit: "minor" as const,
    limit_minor: String(data.budget.amount_minor),
    spent_minor: String(data.totals.variable),
    remaining_minor: String(status.remaining),
    percent_rounded: status.percent,
    attention: budgetAttention(data),
    basis:
      "All recorded variable expenses of the selected month; fixed costs and planned savings are separate. Warning threshold uses unrounded values.",
  };
}
