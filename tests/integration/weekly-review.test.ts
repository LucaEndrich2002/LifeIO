import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadWeeklyReview } from "../../src/server/weekly-review";
import { weeklyInsights } from "../../src/domain/weekly-review";
import { createPlanFixture } from "../supabase/plan-fixtures";
import {
  publicClient,
  removeFixture,
  setFixtureCompletionTime,
} from "../supabase/fixtures";
import { createTask, mutateTask } from "../supabase/task-fixtures";
import { createEvent } from "../supabase/calendar-fixtures";
import { createLinkGoal, financialLinkGoal } from "../supabase/link-fixtures";
import {
  generateReview,
  readReview,
  reviewExpense,
  reviewWeek,
  type ReviewAccount,
} from "../supabase/review-fixtures";

const users: ReviewAccount[] = [];
async function account(options?: Parameters<typeof createPlanFixture>[0]) {
  const user = await createPlanFixture(options);
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
async function context(user: ReviewAccount) {
  const auth = await user.client.auth.getUser();
  const profile = await user.client
    .from("profiles")
    .select("display_name,time_zone,onboarding(*)")
    .single();
  return {
    user: auth.data.user!,
    supabase: user.client,
    profile: profile.data!,
    onboarding: profile.data!.onboarding!,
  };
}
describe("saved owner-scoped weekly reviews", () => {
  it("aggregates all records across month boundaries and includes original Money totals", async () => {
    const user = await account();
    for (let i = 0; i < 26; i++) await reviewExpense(user, "2026-09-29", 101);
    await reviewExpense(user, "2026-09-28", 1000);
    await reviewExpense(user, "2026-10-04", 500);
    await reviewExpense(user, "2026-09-27", 2000);
    await reviewExpense(user, "2026-10-05", 700);
    await reviewExpense(user, "2026-09-20", 900);
    expect(
      (
        await user.client.rpc("mutate_budget", {
          p_operation: "create",
          p_id: randomUUID(),
          p_revision: 0,
          p_payload: { name: "September", amount: 6000, month: "2026-09" },
        })
      ).error,
    ).toBeNull();
    const goal = await financialLinkGoal(user),
      entry = randomUUID();
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "contribute",
          p_id: goal,
          p_entry_id: entry,
          p_revision: 0,
          p_payload: { amount: 12345, date: "2026-10-04", note: "Review" },
        })
      ).error,
    ).toBeNull();
    expect((await generateReview(user)).error).toBeNull();
    const review = await readReview(user),
      data = review.snapshot;
    expect(data.expenses).toEqual({
      current_minor: 4126,
      current_count: 28,
      previous_minor: 2000,
      previous_count: 1,
    });
    expect(data.months.map((m) => m.month)).toEqual(["2026-09", "2026-10"]);
    expect(data.months[0]?.totals).toMatchObject({
      income: 280000,
      variable: 6526,
      fixed: 90000,
      savings: 50000,
    });
    expect(data.months[1]?.totals).toMatchObject({
      income: 0,
      variable: 1200,
      fixed: 90000,
      savings: 50000,
    });
    expect(data.goals).toMatchObject({
      contributions_minor: 12345,
      contribution_count: 1,
    });
    expect(data.goals.items[0]).toMatchObject({
      balance: 362345,
      target_minor: 1000000,
    });
    expect(weeklyInsights(data)[0]?.title).toBe("Monatsbudget überschritten");
    expect(
      (
        await user.client.rpc("mutate_goal", {
          p_operation: "cancel",
          p_id: goal,
          p_entry_id: entry,
          p_revision: 1,
          p_payload: {},
        })
      ).error,
    ).toBeNull();
    expect((await readReview(user)).snapshot).toEqual(data);
    expect((await generateReview(user, reviewWeek, 0)).error).toBeNull();
    expect((await readReview(user)).snapshot.goals).toMatchObject({
      contributions_minor: 0,
      contribution_count: 0,
    });
  });
  it("keeps a stable snapshot on repeated opens and duplicate creation, then visibly refreshes it", async () => {
    const user = await account();
    const ctx = await context(user);
    expect((await loadWeeklyReview(ctx, reviewWeek)).review).toBeNull();
    const results = await Promise.all([
      generateReview(user),
      generateReview(user),
    ]);
    expect(results.every((r) => !r.error)).toBe(true);
    const first = await readReview(user);
    await reviewExpense(user, "2026-10-01", 1234);
    expect((await loadWeeklyReview(ctx, reviewWeek)).review).toEqual(first);
    expect((await generateReview(user)).error).toBeNull();
    expect(await readReview(user)).toEqual(first);
    expect(
      (await user.client.from("weekly_reviews").select("week_start")).data,
    ).toHaveLength(1);
    const refreshed = await Promise.all([
      generateReview(user, reviewWeek, 0),
      generateReview(user, reviewWeek, 0),
    ]);
    expect(refreshed.filter((r) => !r.error)).toHaveLength(1);
    expect(refreshed.find((r) => r.error)?.error?.code).toBe("40001");
    const second = await readReview(user);
    expect(second).toMatchObject({ revision: 1, created_at: first.created_at });
    expect(second.updated_at).not.toBe(first.updated_at);
    expect(second.snapshot.expenses.current_minor).toBe(1234);
    expect((await generateReview(user, reviewWeek, 1)).error).toBeNull();
    expect((await readReview(user)).snapshot).toEqual(second.snapshot);
    expect(weeklyInsights((await readReview(user)).snapshot)).toEqual(
      weeklyInsights(second.snapshot),
    );
  });
  it("counts all open tasks, excludes removed records and bounds detail lists", async () => {
    const user = await account();
    for (let i = 0; i < 27; i++)
      await createTask(user, `Offen ${i}`, "2026-10-04");
    await createTask(user, "Ohne Datum");
    await createTask(user, "Folgewoche", "2026-10-05");
    const done = await createTask(user, "Done", "2026-10-04");
    await mutateTask(user, { p_id: done, p_operation: "complete" });
    const removed = await createTask(user, "Removed", "2026-10-04");
    await mutateTask(user, { p_id: removed, p_operation: "remove" });
    for (let i = 0; i < 8; i++) await createLinkGoal(user, `Ziel ${i}`);
    expect((await generateReview(user)).error).toBeNull();
    const data = (await readReview(user)).snapshot;
    expect(data.tasks).toMatchObject({
      open: 29,
      undated: 1,
      due_by_end: 27,
      next_due: 1,
    });
    expect(data.tasks.items).toHaveLength(3);
    expect(data.goals.total).toBe(9);
    expect(data.goals.items).toHaveLength(6);
  });
  it("uses half-open instant boundaries for completed tasks, milestones and upcoming events", async () => {
    const user = await account(),
      goal = await financialLinkGoal(user);
    for (const [index, time] of [
      "2026-09-27T21:59:59Z",
      "2026-09-27T22:00:00Z",
      "2026-10-04T21:59:59Z",
      "2026-10-04T22:00:00Z",
    ].entries()) {
      const task = await createTask(user, `Boundary ${index}`);
      await setFixtureCompletionTime(user.id, "tasks", task, time);
      const milestone = randomUUID();
      expect(
        (
          await user.client.rpc("mutate_goal_milestone", {
            p_operation: "create",
            p_goal_id: goal,
            p_id: milestone,
            p_revision: 0,
            p_title: `Boundary ${index}`,
          })
        ).error,
      ).toBeNull();
      await setFixtureCompletionTime(
        user.id,
        "goal_milestones",
        milestone,
        time,
      );
    }
    await createEvent(user, "Ends at start", {
      p_starts_at: "2026-10-04T21:00:00Z",
      p_ends_at: "2026-10-04T22:00:00Z",
    });
    await createEvent(user, "Spans week", {
      p_starts_at: "2026-10-04T21:00:00Z",
      p_ends_at: "2026-10-12T00:00:00Z",
    });
    await createEvent(user, "Starts at end", {
      p_starts_at: "2026-10-11T22:00:00Z",
      p_ends_at: "2026-10-11T23:00:00Z",
    });
    const personal = randomUUID();
    expect(
      (
        await user.client.rpc("mutate_personal_goal", {
          p_operation: "create",
          p_id: personal,
          p_revision: 0,
          p_name: "Next goal",
          p_deadline: "2026-10-05",
        })
      ).error,
    ).toBeNull();
    expect((await generateReview(user)).error).toBeNull();
    const data = (await readReview(user)).snapshot;
    expect(data.tasks.completed).toBe(2);
    expect(data.goals.milestones_completed).toBe(2);
    expect(data.events.next_count).toBe(1);
    expect(data.events.items[0]?.title).toBe("Spans week");
    expect(data.goals.next_items.map((g) => g.id)).toEqual([personal]);
  });
  it.each([
    ["2026-03-23", 167],
    ["2025-10-20", 169],
  ])(
    "handles DST week %s and preserves its original zone",
    async (week, hours) => {
      const user = await account();
      expect((await generateReview(user, String(week))).error).toBeNull();
      const first = await readReview(user, String(week));
      expect(
        (Date.parse(first.snapshot.range_end) -
          Date.parse(first.snapshot.range_start)) /
          3600000,
      ).toBe(hours);
      expect(
        (
          await user.client
            .from("profiles")
            .update({ time_zone: "America/New_York" })
            .eq("user_id", user.id)
        ).error,
      ).toBeNull();
      expect((await generateReview(user, String(week), 0)).error).toBeNull();
      expect((await readReview(user, String(week))).snapshot).toEqual(
        first.snapshot,
      );
    },
  );
  it("rejects anonymous, incomplete, malformed and future requests and all direct writes", async () => {
    const user = await account(),
      other = await account(),
      incomplete = await account({ complete: false });
    await reviewExpense(other, "2026-10-01", 99999);
    await createTask(other, "Foreign private task");
    expect((await generateReview(other)).error).toBeNull();
    expect((await generateReview(user)).error).toBeNull();
    const foreign = await readReview(other);
    expect((await readReview(user)).snapshot.expenses.current_count).toBe(0);
    expect(
      (
        await user.client
          .from("weekly_reviews")
          .select("*")
          .eq("user_id", other.id)
      ).data,
    ).toEqual([]);
    for (const change of [
      { snapshot: {} },
      { user_id: other.id },
      { rule_version: 2 },
    ])
      expect(
        (
          await user.client
            .from("weekly_reviews")
            .update(change)
            .eq("user_id", user.id)
        ).error,
      ).not.toBeNull();
    expect(
      (
        await user.client.from("weekly_reviews").insert({
          user_id: user.id,
          week_start: "2026-09-21",
          time_zone: "UTC",
          snapshot: {},
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await user.client
          .from("weekly_reviews")
          .delete()
          .eq("user_id", other.id)
      ).error,
    ).not.toBeNull();
    expect(
      (await publicClient().from("weekly_reviews").select("*")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("generate_weekly_review", {
          p_week: reviewWeek,
          p_revision: -1,
        })
      ).error,
    ).not.toBeNull();
    expect((await generateReview(incomplete)).error?.code).toBe("42501");
    for (const week of [
      "2026-02-30",
      "2026-09-29",
      "1999-12-27",
      "2100-12-13",
      "2100-12-20",
      "bad",
    ])
      expect((await generateReview(user, week)).error).not.toBeNull();
    for (const revision of [-2, 2147483647])
      expect(
        (await generateReview(user, reviewWeek, revision)).error,
      ).not.toBeNull();
    expect((await generateReview(user, "2026-09-21", 0)).error?.code).toBe(
      "40001",
    );
    expect(await readReview(other)).toEqual(foreign);
  });
});
