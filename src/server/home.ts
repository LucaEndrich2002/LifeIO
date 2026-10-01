import "server-only";
import { homeGoalsSchema, homePeriod } from "@/domain/home";
import { taskSnapshotSchema } from "@/domain/tasks";
import { loadMoneyMonth, type requireMoneyAccount } from "@/server/money";
import { loadTasks } from "@/server/tasks";
import { loadCalendar } from "@/server/calendar";
type Account = Awaited<ReturnType<typeof requireMoneyAccount>>;
export async function loadHome(
  account: Account,
  month: string,
  goalPage: number,
  now = new Date(),
) {
  const period = homePeriod(now, account.profile.time_zone, month);
  const [money, tasks, events, goals, overdue] = await Promise.all([
    loadMoneyMonth(account.supabase, month, 0, 0),
    loadTasks(account, {
      day: period.day,
      view: "day",
      status: "open",
      page: 0,
    }),
    loadCalendar(account, period.range.start, period.range.end, 0),
    account.supabase.rpc("read_home_goals", {
      p_day: period.day,
      p_page: goalPage,
    }),
    account.supabase
      .from("tasks")
      .select("id,title,priority,due_on,revision,completed_at", {
        count: "exact",
      })
      .eq("user_id", account.user.id)
      .is("removed_at", null)
      .is("completed_at", null)
      .lt("due_on", period.day)
      .order("due_on")
      .order("id")
      .limit(3),
  ]);
  if (goals.error || overdue.error) throw new Error("Home unavailable.");
  return {
    ...period,
    money,
    tasks,
    events,
    goals: homeGoalsSchema.parse(goals.data),
    overdue: taskSnapshotSchema.parse({
      items: overdue.data,
      total: overdue.count,
    }),
  };
}
