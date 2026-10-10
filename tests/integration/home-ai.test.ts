import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import { createAiPersonal } from "../supabase/ai-goals-fixtures";
import { createTask } from "../supabase/task-fixtures";
import { loadHomeInsight } from "../../src/server/ai/home-data";
import { loadAiMonth } from "../../src/server/ai/month-data";
const users: Awaited<ReturnType<typeof createPlanFixture>>[] = [];
async function account(complete = true) {
  const user = await createPlanFixture({ complete, skipGoal: true });
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
const query = { month: "2026-09", goal_page: 1 };
const now = new Date("2026-10-10T12:00:00Z");
describe("Home insight with authorized real data", () => {
  it("preserves selected month and goal page, uses the current week and isolates foreign accounts", async () => {
    const user = await account(),
      foreign = await account();
    for (let i = 0; i < 7; i++)
      await createAiPersonal(user, `Eigenes Ziel ${i}`, `2100-01-0${i + 1}`);
    await createAiPersonal(foreign, "Fremdes geheimes Ziel");
    await createTask(user, "Eigene Aufgabe", "2026-10-10");
    await createTask(foreign, "Fremde geheime Aufgabe", "2026-10-10");
    const month = await loadHomeInsight(
      user.client,
      { ...query, insight: "month" },
      now,
    );
    expect(month.status).toBe("ready");
    if (month.status !== "ready" || month.kind !== "month")
      throw new Error("Expected month preview.");
    expect(month.snapshot.facts).toEqual(
      (await loadAiMonth(user.client, query.month)).facts,
    );
    const goals = await loadHomeInsight(
      user.client,
      { ...query, insight: "goals" },
      now,
    );
    expect(goals.status).toBe("ready");
    if (goals.status !== "ready" || goals.kind !== "goals")
      throw new Error("Expected goal preview.");
    expect(goals.snapshot.facts).toMatchObject({ page: 1, total: 7 });
    expect(goals.snapshot.names.map((goal) => goal.name)).toEqual([
      "Eigenes Ziel 6",
    ]);
    const plan = await loadHomeInsight(
      user.client,
      { ...query, insight: "plan" },
      now,
    );
    expect(plan.status).toBe("ready");
    if (plan.status !== "ready" || plan.kind !== "plan")
      throw new Error("Expected plan preview.");
    expect(plan.snapshot.facts).toMatchObject({
      week_start: "2026-10-05",
      week_end: "2026-10-11",
    });
    expect(plan.snapshot.facts.tasks.map((task) => task.title)).toEqual([
      "Eigene Aufgabe",
    ]);
    expect(JSON.stringify([month, goals, plan])).not.toContain("Fremd");
    expect(
      (await user.client.from("ai_request_limits").select("*")).data,
    ).toEqual([]);
  });
  it("keeps empty, unavailable and unauthorized states distinct without claiming zero-valued facts", async () => {
    const user = await account(),
      unfinished = await account(false);
    const empty = await loadHomeInsight(user.client, {
      ...query,
      insight: "goals",
    });
    expect(empty).toMatchObject({
      status: "ready",
      kind: "goals",
      snapshot: { facts: { total: 0, goals: [] } },
    });
    for (const client of [publicClient(), unfinished.client])
      for (const insight of ["month", "plan", "goals"])
        expect(await loadHomeInsight(client, { ...query, insight })).toEqual({
          status: "unavailable",
        });
    expect(await loadHomeInsight(user.client, query)).toEqual({
      status: "idle",
    });
  });
});
