import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { z } from "zod";
import {
  personalGoalSchema,
  personalDeadlineLabel,
} from "@/domain/personal-goals";
import { PersonalGoalForm } from "@/features/goals/personal-goal-form";
import { MilestonesSection } from "@/features/goals/milestones-section";
import { loadMilestones } from "@/server/milestones";
import type { requireMoneyAccount } from "@/server/money";

export async function PersonalGoalScreen({
  account,
  id,
  editing,
  page,
}: {
  account: Awaited<ReturnType<typeof requireMoneyAccount>>;
  id: string;
  editing: boolean;
  page: number;
}) {
  let goal: z.output<typeof personalGoalSchema> | null = null;
  if (id !== "new") {
    const { data, error } = await account.supabase
      .from("goals")
      .select("id,kind,name,deadline,revision")
      .eq("user_id", account.user.id)
      .eq("id", id)
      .eq("kind", "personal")
      .maybeSingle();
    if (error) throw new Error("Personal goal unavailable.");
    if (!data) notFound();
    goal = personalGoalSchema.parse(data);
  }
  if (!goal || editing)
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">
          {goal ? "Persönliches Ziel bearbeiten" : "Persönliches Ziel anlegen"}
        </h1>
        <PersonalGoalForm
          initial={{
            id: goal?.id ?? randomUUID(),
            operation: goal ? "update" : "create",
            revision: goal?.revision ?? 0,
            name: goal?.name ?? "",
            deadline: goal?.deadline ?? "",
          }}
        />
      </div>
    );
  const milestones = await loadMilestones(account.supabase, id, page);
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Persönliches Ziel
        </p>
        <h1 className="break-words text-3xl font-semibold">{goal.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {personalDeadlineLabel(goal.deadline)}
        </p>
      </div>
      <Link
        href={`/account/goals/${id}?edit=1`}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Persönliches Ziel bearbeiten
      </Link>
      <MilestonesSection
        goalId={id}
        data={milestones}
        page={page}
        kind="personal"
      />
      <Link
        href="/account/goals?kind=personal"
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        Alle persönlichen Ziele
      </Link>
    </div>
  );
}
