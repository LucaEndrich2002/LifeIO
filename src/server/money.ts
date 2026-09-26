import "server-only";
import { redirect } from "next/navigation";
import { nextStep } from "@/domain/onboarding";
import { moneySnapshotSchema } from "@/domain/transactions";
import { requireIdentity } from "@/server/identity";

export async function requireMoneyAccount() {
  const identity = await requireIdentity();
  const { data, error } = await identity.supabase
    .from("profiles")
    .select("display_name,time_zone,onboarding(*)")
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (error) throw new Error("Account unavailable.");
  if (!data) redirect("/account");
  if (!data.onboarding?.completed_at)
    redirect(`/account/onboarding/${nextStep(data.onboarding)}`);
  return { ...identity, profile: data, onboarding: data.onboarding };
}

export async function loadMoneyMonth(
  supabase: Awaited<ReturnType<typeof requireMoneyAccount>>["supabase"],
  month: string,
  incomePage: number,
  expensePage: number,
) {
  const { data, error } = await supabase.rpc("read_money_month", {
    p_month: month,
    p_income_page: incomePage,
    p_expense_page: expensePage,
  });
  if (error) throw new Error("Month unavailable.");
  const parsed = moneySnapshotSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("Month totals or records outside supported range.");
  return parsed.data;
}
