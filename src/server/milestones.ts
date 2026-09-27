import "server-only";
import { notFound } from "next/navigation";
import { milestoneSnapshotSchema } from "@/domain/milestones";
import type { requireMoneyAccount } from "@/server/money";

export async function loadMilestones(
  supabase: Awaited<ReturnType<typeof requireMoneyAccount>>["supabase"],
  goalId: string,
  page: number,
) {
  const { data, error } = await supabase.rpc("read_goal_milestones", {
    p_goal_id: goalId,
    p_page: page,
  });
  if (error) throw new Error("Milestones unavailable.");
  if (!data) notFound();
  const parsed = milestoneSnapshotSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid milestone snapshot.");
  return parsed.data;
}
