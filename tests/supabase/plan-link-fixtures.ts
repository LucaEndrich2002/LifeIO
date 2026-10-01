import { randomUUID } from "node:crypto";
import { createTask, mutateTask } from "./task-fixtures";
import { createEvent, mutateEvent } from "./calendar-fixtures";
import type { LinkAccount } from "./link-fixtures";
import {
  planRelationship,
  type PlanKind,
} from "../../src/domain/goal-plan-links";
export const createPlanTarget = (
  user: LinkAccount,
  kind: PlanKind,
  title = "Nächster Schritt",
) => (kind === "task" ? createTask(user, title) : createEvent(user, title));
export const removePlanTarget = (
  user: LinkAccount,
  kind: PlanKind,
  id: string,
) =>
  kind === "task"
    ? mutateTask(user, { p_operation: "remove", p_id: id })
    : mutateEvent(user, { p_operation: "remove", p_id: id });
export const mutatePlanLink = (
  user: LinkAccount,
  goal: string,
  kind: PlanKind,
  target: string,
  id: string = randomUUID(),
  operation = "create",
) =>
  user.client.rpc("mutate_goal_plan_link", {
    p_id: id,
    p_goal_id: goal,
    p_kind: kind,
    p_target_id: target,
    p_operation: operation,
  });
export const planLinkRows = (
  user: LinkAccount,
  goal: string,
  kind: PlanKind,
  page = 0,
) =>
  user.client
    .from("entity_links")
    .select("id,goal_id,task_id,calendar_event_id,relationship", {
      count: "exact",
    })
    .eq("goal_id", goal)
    .eq("relationship", planRelationship[kind])
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
