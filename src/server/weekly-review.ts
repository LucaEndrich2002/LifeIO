import "server-only";
import { weeklyReviewSchema, reviewWeekSchema } from "@/domain/weekly-review";
import type { requireMoneyAccount } from "@/server/money";

export async function loadWeeklyReview(
  account: Awaited<ReturnType<typeof requireMoneyAccount>>,
  week: string,
) {
  const valid = reviewWeekSchema.parse(week);
  const [selected, history] = await Promise.all([
    account.supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", account.user.id)
      .eq("week_start", valid)
      .maybeSingle(),
    account.supabase
      .from("weekly_reviews")
      .select("week_start")
      .eq("user_id", account.user.id)
      .order("week_start", { ascending: false })
      .limit(12),
  ]);
  if (selected.error || history.error)
    throw new Error("Weekly review unavailable.");
  return {
    review: selected.data ? weeklyReviewSchema.parse(selected.data) : null,
    history: history.data.map((row) => reviewWeekSchema.parse(row.week_start)),
  };
}
