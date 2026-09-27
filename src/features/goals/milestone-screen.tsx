import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { milestonePageSchema } from "@/domain/milestones";
import {
  MilestoneForm,
  type MilestoneInitial,
} from "@/features/goals/milestone-form";
import { requireMoneyAccount } from "@/server/money";

export async function MilestoneScreen({
  goalId,
  id,
  action,
  page,
}: {
  goalId: string;
  id: string;
  action?: string;
  page?: string;
}) {
  const { supabase, user } = await requireMoneyAccount();
  const selected = milestonePageSchema.safeParse(page ?? "0");
  if (
    !z.uuid().safeParse(goalId).success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    !selected.success ||
    (action !== undefined && action !== "remove") ||
    (id === "new" && action)
  )
    notFound();
  const { data: goal, error } = await supabase
    .from("goals")
    .select("id,name")
    .eq("user_id", user.id)
    .eq("id", goalId)
    .maybeSingle();
  if (error) throw new Error("Goal unavailable.");
  if (!goal) notFound();
  let initial: MilestoneInitial = {
    goal_id: goalId,
    id: randomUUID(),
    revision: 0,
    operation: "create",
    title: "",
    return_page: selected.data,
  };
  if (id !== "new") {
    const { data: entry, error } = await supabase
      .from("goal_milestones")
      .select("id,title,revision")
      .eq("user_id", user.id)
      .eq("goal_id", goalId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Milestone unavailable.");
    if (!entry) notFound();
    initial = {
      ...initial,
      ...entry,
      operation: action === "remove" ? "remove" : "rename",
    };
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {id === "new"
          ? "Meilenstein anlegen"
          : action === "remove"
            ? "Meilenstein entfernen"
            : "Meilenstein bearbeiten"}
      </h1>
      <p className="break-words text-sm text-muted-foreground">
        Sparziel: {goal.name}
      </p>
      <MilestoneForm initial={initial} />
    </div>
  );
}
