import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  planLinksPageSchema,
  planGoalsPageSchema,
  planRelationship,
  type PlanKind,
  type PlanTarget,
} from "@/domain/goal-plan-links";
import { loadTask } from "@/server/tasks";
import { loadCalendarEvent } from "@/server/calendar";
import type { requireMoneyAccount } from "@/server/money";
type Account = Awaited<ReturnType<typeof requireMoneyAccount>>;
export async function loadPlanTarget(
  account: Account,
  kind: PlanKind,
  id: string,
): Promise<PlanTarget> {
  return kind === "task"
    ? { kind, item: await loadTask(account, id) }
    : { kind, item: await loadCalendarEvent(account, id) };
}
export async function loadGoalPlanLinks(
  { supabase, user }: Account,
  goalId: string,
  kind: PlanKind,
  page: number,
) {
  if (kind === "task") {
    const { data, error, count } = await supabase
      .from("entity_links")
      .select(
        "id,target:tasks!inner(id,title,priority,due_on,completed_at,revision)",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .eq("goal_id", goalId)
      .eq("relationship", "requires")
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 25, page * 25 + 24);
    if (error) throw new Error("Task links unavailable.");
    return planLinksPageSchema.parse({
      items: data.map((row) => ({
        link_id: row.id,
        target: { kind, item: row.target },
      })),
      count,
    });
  }
  const { data, error, count } = await supabase
    .from("entity_links")
    .select(
      "id,target:calendar_events!inner(id,title,starts_at,ends_at,time_zone,revision)",
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .eq("goal_id", goalId)
    .eq("relationship", "scheduled_as")
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Event links unavailable.");
  return planLinksPageSchema.parse({
    items: data.map((row) => ({
      link_id: row.id,
      target: { kind, item: row.target },
    })),
    count,
  });
}
export async function loadPlanCandidates(
  { supabase, user }: Account,
  kind: PlanKind,
  page: number,
) {
  if (kind === "task") {
    const { data, error, count } = await supabase
      .from("tasks")
      .select("id,title,priority,due_on,completed_at,revision", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 25, page * 25 + 24);
    if (error) throw new Error("Task selection unavailable.");
    return planLinksPageSchema.parse({
      items: data.map((item) => ({ target: { kind, item } })),
      count,
    });
  }
  const { data, error, count } = await supabase
    .from("calendar_events")
    .select("id,title,starts_at,ends_at,time_zone,revision", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Event selection unavailable.");
  return planLinksPageSchema.parse({
    items: data.map((item) => ({ target: { kind, item } })),
    count,
  });
}
export async function loadPlanGoals(
  { supabase, user }: Account,
  kind: PlanKind,
  targetId: string,
  page: number,
) {
  const { data, error, count } = await supabase
    .from("entity_links")
    .select("id,goal:goals!inner(id,name,kind)", { count: "exact" })
    .eq("user_id", user.id)
    .eq(kind === "task" ? "task_id" : "calendar_event_id", targetId)
    .eq("relationship", planRelationship[kind])
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw new Error("Linked goals unavailable.");
  return planGoalsPageSchema.parse({ items: data, count });
}
export async function loadPlanLink(
  { supabase, user }: Account,
  goalId: string,
  kind: PlanKind,
  linkId: string,
) {
  const { data, error } = await supabase
    .from("entity_links")
    .select("task_id,calendar_event_id")
    .eq("user_id", user.id)
    .eq("goal_id", goalId)
    .eq("relationship", planRelationship[kind])
    .eq("id", linkId)
    .maybeSingle();
  if (error) throw new Error("Link unavailable.");
  if (!data) notFound();
  return z
    .uuid()
    .parse(kind === "task" ? data.task_id : data.calendar_event_id);
}
export async function planLinkExists(
  { supabase, user }: Account,
  goalId: string,
  kind: PlanKind,
  targetId: string,
) {
  const { data, error } = await supabase
    .from("entity_links")
    .select("id")
    .eq("user_id", user.id)
    .eq("goal_id", goalId)
    .eq("relationship", planRelationship[kind])
    .eq(kind === "task" ? "task_id" : "calendar_event_id", targetId)
    .maybeSingle();
  if (error) throw new Error("Link unavailable.");
  return !!data;
}
