import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  aiReadGrantSchema,
  aiReadRequestSchema,
  aiPage,
  aiFinancialFacts,
  aiBudgetFacts,
} from "@/domain/ai-read-tools";
import { aiEventRange } from "@/domain/ai-event-range";
import { dateInZone } from "@/domain/transactions";
import { profileSchema } from "@/domain/profile";
import { homeGoalsSchema } from "@/domain/home";
import { goalProgress, goalSnapshotSchema } from "@/domain/goals";
import { milestoneProgress } from "@/domain/milestones";
import { forecastGoal } from "@/domain/goal-forecast";
import {
  taskSnapshotSchema,
  taskWeek,
  taskIsOverdue,
  taskListHref,
} from "@/domain/tasks";
import { calendarSnapshotSchema } from "@/domain/calendar";
import { loadMoneyMonth } from "@/server/money";

type ErrorCode =
  | "invalid_input"
  | "not_allowed"
  | "authentication_required"
  | "setup_required"
  | "unavailable";
const failure = (code: ErrorCode) => ({ status: "error" as const, code });

// The client and grant originate from the authenticated server caller, never
// from model arguments. Every invocation revalidates identity and onboarding.
export async function readAiTool(
  client: SupabaseClient<Database>,
  rawRequest: unknown,
  grant: unknown,
  now = new Date(),
) {
  const permission = aiReadGrantSchema.safeParse(grant),
    parsed = aiReadRequestSchema.safeParse(rawRequest);
  if (!parsed.success) return failure("invalid_input");
  if (!permission.success || !permission.data.includes(parsed.data.name))
    return failure("not_allowed");
  const request = parsed.data;
  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return failure("authentication_required");
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("time_zone,onboarding(completed_at)")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (profileError) return failure("unavailable");
    if (!profile?.onboarding?.completed_at) return failure("setup_required");
    const zone = profileSchema.shape.time_zone.parse(profile.time_zone),
      today = dateInZone(now, zone);
    const metadata = {
      status: "ok" as const,
      tool: request.name,
      observed_at: now.toISOString(),
      time_zone: zone,
    };
    switch (request.name) {
      case "get_financial_summary":
      case "get_budget_status": {
        const month = request.arguments.month,
          snapshot = await loadMoneyMonth(client, month, 0, 0);
        return {
          ...metadata,
          period: { month },
          source: {
            label: "Money",
            href: `/account/money?month=${month}${request.name === "get_budget_status" ? "#budget" : ""}`,
          },
          data:
            request.name === "get_financial_summary"
              ? aiFinancialFacts(snapshot)
              : aiBudgetFacts(snapshot),
        };
      }
      case "get_goals": {
        const { data, error } = await client.rpc("read_home_goals", {
          p_day: today,
          p_page: request.arguments.page,
        });
        if (error) return failure("unavailable");
        const result = homeGoalsSchema.parse(data);
        return {
          ...metadata,
          period: { as_of: today },
          source: {
            label: "Goals",
            href: `/account/home?goal_page=${request.arguments.page}#home-goals`,
          },
          coverage: aiPage(request.arguments.page, 6, result.total),
          data: result.items.map((goal) => ({
            goal_id: goal.id,
            name: goal.name,
            kind: goal.kind,
            deadline: goal.deadline,
            progress:
              goal.kind === "financial"
                ? {
                    currency: "EUR",
                    amount_unit: "minor",
                    target_minor: String(goal.target_minor),
                    balance_minor: String(goal.balance),
                    percent: goalProgress(goal.target_minor, goal.balance)
                      .percent,
                  }
                : {
                    milestones: goal.milestone_total,
                    completed: goal.milestone_completed,
                    percent: milestoneProgress(
                      goal.milestone_total,
                      goal.milestone_completed,
                    ),
                  },
          })),
        };
      }
      case "get_goal_projection": {
        const { data, error } = await client.rpc("read_goal", {
          p_id: request.arguments.goal_id,
          p_page: 0,
        });
        // Foreign, missing and personal goals have the same non-disclosing result.
        if (error || !data) return failure("unavailable");
        const { goal, balance, rates } = goalSnapshotSchema.parse(data);
        const forecast = forecastGoal({
          targetMinor: goal.target_minor,
          balanceMinor: balance,
          today,
          deadline: goal.deadline,
          rates,
        });
        const { remainingMinor, ...projection } = forecast;
        return {
          ...metadata,
          period: { as_of: today },
          source: { label: "Sparziel", href: `/account/goals/${goal.id}` },
          data: {
            goal_id: goal.id,
            name: goal.name,
            currency: "EUR",
            amount_unit: "minor",
            target_minor: String(goal.target_minor),
            balance_minor: String(balance),
            remaining_minor: String(remainingMinor),
            deadline: goal.deadline,
            projection,
            assumptions:
              "Future planned contributions at month end, first in the following month. Scheduled rate changes and pauses apply. Planned payments do not increase actual balance; missed payments are not caught up.",
          },
        };
      }
      case "get_tasks": {
        const args = request.arguments;
        const { data, error } = await client.rpc("read_tasks", {
          p_day: args.day,
          p_view: args.view,
          p_status: "open",
          p_page: args.page,
        });
        if (error) return failure("unavailable");
        const result = taskSnapshotSchema.parse(data);
        return {
          ...metadata,
          period:
            args.view === "week"
              ? taskWeek(args.day)
              : { day: args.view === "undated" ? null : args.day },
          source: {
            label: "Offene Aufgaben",
            href: taskListHref({ ...args, status: "open" }),
          },
          coverage: aiPage(args.page, 25, result.total),
          data: result.items.map((task) => ({
            task_id: task.id,
            title: task.title,
            priority: task.priority,
            due_on: task.due_on,
            overdue: taskIsOverdue(task, today),
          })),
        };
      }
      case "get_upcoming_events": {
        const args = request.arguments;
        let range: ReturnType<typeof aiEventRange>;
        try {
          range = aiEventRange(args.day, args.days, zone, now);
        } catch {
          return failure("invalid_input");
        }
        const { data, error } = await client.rpc("read_calendar_events", {
          p_start: range.start,
          p_end: range.end,
          p_page: args.page,
        });
        if (error) return failure("unavailable");
        const result = calendarSnapshotSchema.parse(data);
        return {
          ...metadata,
          period: { ...range, end_exclusive: true },
          source: {
            label: "Kalender",
            href: `/account/plan/calendar?view=day&day=${args.day}`,
          },
          coverage: aiPage(args.page, 25, result.total),
          data: result.items.map((event) => ({
            event_id: event.id,
            href: `/account/plan/calendar/${event.id}`,
            title: event.title,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            time_zone: event.time_zone,
          })),
        };
      }
    }
  } catch {
    // Do not expose SQL, credentials, field contents or raw provider errors.
    return failure("unavailable");
  }
}
