import "server-only";
import { redirect } from "next/navigation";
import { requireIdentity } from "@/server/identity";

export async function loadOnboarding() {
  const { supabase, user } = await requireIdentity();
  // One relational query keeps decisions and initial records on the same snapshot.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name,time_zone,currency,onboarding(*),incomes(*),expenses(*),goals(*),tasks(*)",
    )
    .eq("user_id", user.id)
    .not("tasks.onboarding_slot", "is", null)
    .maybeSingle();
  if (error) throw new Error("Onboarding unavailable.");
  if (!data) redirect("/account");
  // Only the original financial setup record belongs in the onboarding summary.
  const goal = data.goals.find(
    (item) => item.kind === "financial" && item.onboarding_slot === 0,
  );
  if (
    goal &&
    (goal.target_minor === null ||
      goal.current_minor === null ||
      goal.monthly_minor === null)
  )
    throw new Error("Incomplete financial goal.");
  return {
    profile: {
      display_name: data.display_name,
      time_zone: data.time_zone,
      currency: data.currency,
    },
    state: data.onboarding,
    tasks: data.tasks
      .filter((item) => item.onboarding_slot !== null)
      .sort((a, b) => a.onboarding_slot! - b.onboarding_slot!),
    income: data.incomes[0] ?? null,
    expenses: data.expenses.sort(
      (a, b) => (a.onboarding_slot ?? 0) - (b.onboarding_slot ?? 0),
    ),
    goal: goal
      ? {
          ...goal,
          target_minor: goal.target_minor!,
          current_minor: goal.current_minor!,
          monthly_minor: goal.monthly_minor!,
        }
      : null,
  };
}

export type OnboardingData = Awaited<ReturnType<typeof loadOnboarding>>;
