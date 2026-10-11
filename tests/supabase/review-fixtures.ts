import { randomUUID } from "node:crypto";
import { weeklyReviewSchema } from "../../src/domain/weekly-review";
import type { createPlanFixture } from "./plan-fixtures";
export type ReviewAccount = Awaited<ReturnType<typeof createPlanFixture>>;
export const reviewWeek = "2026-09-28";
export const generateReview = (
  user: ReviewAccount,
  week = reviewWeek,
  revision = -1,
) =>
  user.client.rpc("generate_weekly_review", {
    p_week: week,
    p_revision: revision,
  });
export async function readReview(user: ReviewAccount, week = reviewWeek) {
  const result = await user.client
    .from("weekly_reviews")
    .select("*")
    .eq("week_start", week)
    .single();
  if (result.error) throw new Error("Could not read review fixture.");
  return weeklyReviewSchema.parse(result.data);
}
export async function reviewExpense(
  user: ReviewAccount,
  day: string,
  amount: number,
) {
  const id = randomUUID();
  const result = await user.client.rpc("mutate_money", {
    p_kind: "expense",
    p_operation: "create",
    p_id: id,
    p_revision: 0,
    p_payload: {
      name: "Review expense",
      amount,
      spent_on: day,
      category: "other",
    },
  });
  if (result.error) throw new Error("Could not prepare review expense.");
  return id;
}
