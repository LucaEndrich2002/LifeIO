import "server-only";
import { notFound } from "next/navigation";
import {
  budgetGoalPageSchema,
  goalBudgetPageSchema,
  linkedGoalSchema,
  linkedBudgetSchema,
} from "@/domain/goal-budget-links";
import type { requireMoneyAccount } from "@/server/money";
type Account = Awaited<ReturnType<typeof requireMoneyAccount>>;

export async function loadLinkGoal({ supabase, user }: Account, id: string) {
  const { data, error } = await supabase
    .from("goals")
    .select("id,name,kind")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Goal unavailable.");
  if (!data) notFound();
  return linkedGoalSchema.parse(data);
}
export async function loadGoalBudgetLinks(
  { supabase, user }: Account,
  id: string,
  page: number,
) {
  const { data, error, count } = await supabase
    .from("entity_links")
    .select("id,budget:budgets!inner(id,name,month,amount_minor,currency)", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .eq("goal_id", id)
    .eq("relationship", "funded_by")
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Goal links unavailable.");
  return goalBudgetPageSchema.parse({ items: data, count });
}
export async function loadLinkBudget({ supabase, user }: Account, id: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("id,name,month,amount_minor,currency")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Budget unavailable.");
  if (!data) notFound();
  return linkedBudgetSchema.parse(data);
}
export async function loadBudgetGoalLinks(
  { supabase, user }: Account,
  id: string,
  page: number,
) {
  const { data, error, count } = await supabase
    .from("entity_links")
    .select("id,goal:goals!inner(id,name,kind)", { count: "exact" })
    .eq("user_id", user.id)
    .eq("budget_id", id)
    .eq("relationship", "funded_by")
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Budget links unavailable.");
  return budgetGoalPageSchema.parse({ items: data, count });
}
