import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiMonthFactsSchema, type AiMonthFacts } from "@/domain/ai-month";
import { monthSchema } from "@/domain/money";
import { readAiTool } from "@/server/ai/read-tools";

export function monthFingerprint(facts: AiMonthFacts) {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}
export async function loadAiMonth(
  client: SupabaseClient<Database>,
  month: string,
) {
  monthSchema.parse(month);
  const grant = ["get_financial_summary", "get_budget_status"] as const;
  const summary = await readAiTool(
    client,
    { name: grant[0], arguments: { month } },
    grant,
  );
  const budget = await readAiTool(
    client,
    { name: grant[1], arguments: { month } },
    grant,
  );
  if (
    summary.status !== "ok" ||
    budget.status !== "ok" ||
    !("income_minor" in summary.data) ||
    !("status" in budget.data)
  )
    throw new Error("Month unavailable.");
  const data = summary.data,
    limit = budget.data;
  const facts = aiMonthFactsSchema.parse({
    currency: "EUR",
    amount_unit: "minor",
    month,
    time_zone: summary.time_zone,
    income: data.income_minor,
    fixed: data.fixed_minor,
    variable: data.variable_minor,
    savings: data.planned_savings_minor,
    available: data.available_minor,
    income_count: data.income_count,
    expense_count: data.expense_count,
    missing: data.missing_basis,
    budget:
      limit.status === "not_set"
        ? { status: "not_set" }
        : {
            status: "set",
            limit: limit.limit_minor,
            spent: limit.spent_minor,
            remaining: limit.remaining_minor,
            percent: limit.percent_rounded,
            attention: limit.attention,
          },
  });
  // Detect a concurrent expense update between the two existing read tools.
  if (facts.budget.status === "set" && facts.budget.spent !== facts.variable)
    throw new Error("Month changed.");
  return {
    facts,
    fingerprint: monthFingerprint(facts),
    observedAt: budget.observed_at,
  };
}
