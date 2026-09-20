import "server-only";
import { redirect } from "next/navigation";
import { requireIdentity } from "@/server/identity";

export async function loadOnboarding() {
  const { supabase, user } = await requireIdentity();
  // One relational query keeps decisions and financial rows on the same snapshot.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name,time_zone,currency,onboarding(*),incomes(*),expenses(*),goals(*)",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Onboarding unavailable.");
  if (!data) redirect("/account");
  return {
    profile: {
      display_name: data.display_name,
      time_zone: data.time_zone,
      currency: data.currency,
    },
    state: data.onboarding,
    income: data.incomes[0] ?? null,
    expenses: data.expenses.sort(
      (a, b) => a.onboarding_slot - b.onboarding_slot,
    ),
    goal: data.goals[0] ?? null,
  };
}

export type OnboardingData = Awaited<ReturnType<typeof loadOnboarding>>;
