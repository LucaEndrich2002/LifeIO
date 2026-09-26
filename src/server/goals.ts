import "server-only";
import { notFound } from "next/navigation";
import { goalSnapshotSchema } from "@/domain/goals";
import type { requireMoneyAccount } from "@/server/money";

export async function loadGoal(
  supabase: Awaited<ReturnType<typeof requireMoneyAccount>>["supabase"],
  id: string,
  page: number,
) {
  const { data, error } = await supabase.rpc("read_goal", {
    p_id: id,
    p_page: page,
  });
  if (error) throw new Error("Goal unavailable.");
  if (!data) notFound();
  const parsed = goalSnapshotSchema.safeParse(data);
  if (!parsed.success) throw new Error("Goal data outside supported range.");
  return parsed.data;
}
