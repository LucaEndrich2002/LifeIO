import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { aiPlanFactsSchema, aiPlanPeriod } from "@/domain/ai-plan";
import { profileSchema } from "@/domain/profile";
import { readAiTool } from "@/server/ai/read-tools";

export async function loadAiPlan(
  client: SupabaseClient<Database>,
  now = new Date(),
) {
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Plan unavailable.");
  const profile = await client
    .from("profiles")
    .select("time_zone")
    .eq("user_id", auth.data.user.id)
    .maybeSingle();
  if (profile.error || !profile.data) throw new Error("Plan unavailable.");
  const zone = profileSchema.shape.time_zone.parse(profile.data.time_zone);
  const period = aiPlanPeriod(now, zone);
  const grant = ["get_tasks", "get_upcoming_events"] as const;
  const tasks = await readAiTool(
    client,
    {
      name: "get_tasks",
      arguments: { day: period.as_of, view: "week", page: 0 },
    },
    grant,
    now,
  );
  const events = await readAiTool(
    client,
    {
      name: "get_upcoming_events",
      arguments: { day: period.as_of, days: period.event_days, page: 0 },
    },
    grant,
    now,
  );
  if (
    tasks.status !== "ok" ||
    events.status !== "ok" ||
    !Array.isArray(tasks.data) ||
    !Array.isArray(events.data) ||
    !("coverage" in tasks) ||
    !("coverage" in events) ||
    tasks.time_zone !== zone ||
    events.time_zone !== zone
  )
    throw new Error("Plan unavailable.");
  const facts = aiPlanFactsSchema.parse({
    as_of: period.as_of,
    week_start: period.week_start,
    week_end: period.week_end,
    time_zone: zone,
    tasks_total: tasks.coverage.total,
    events_total: events.coverage.total,
    // Names are necessary to explain the selected work. Internal IDs, links,
    // revisions, completed work, finances and other weeks are never sent.
    tasks: tasks.data.map((task) => {
      if (!("task_id" in task)) throw new Error("Plan unavailable.");
      return {
        title: task.title,
        priority: task.priority,
        due_on: task.due_on,
        overdue: task.overdue,
      };
    }),
    events: events.data.map((event) => {
      if (!("event_id" in event)) throw new Error("Plan unavailable.");
      return {
        title: event.title,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        ongoing: new Date(event.starts_at) <= now,
      };
    }),
  });
  return {
    facts,
    // Moving seconds do not invalidate unchanged facts. A local day change,
    // event beginning/ending, or changed visible data does invalidate consent.
    fingerprint: createHash("sha256")
      .update(JSON.stringify(facts))
      .digest("hex"),
    observedAt: now.toISOString(),
  };
}
