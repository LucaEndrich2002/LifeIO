import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import type { Json } from "../../src/types/database";

type Account = Awaited<ReturnType<typeof createPlanFixture>>;
const users: Account[] = [];
const task = { title: "Reise planen", priority: "high", due_on: "2028-02-29" };
const save = (user: Account, step: string, payload: Json, revision: number) =>
  user.client.rpc("save_onboarding_step", {
    p_step: step,
    p_payload: payload,
    p_revision: revision,
  });
async function account() {
  const user = await createPlanFixture({ complete: false });
  users.push(user);
  for (const [revision, step] of ["income", "expenses", "goal"].entries())
    expect(
      (
        await save(
          user,
          step,
          {
            decision: "skipped",
            ...(step === "income" ? { month: "2026-10" } : {}),
          },
          revision,
        )
      ).error,
    ).toBeNull();
  return user;
}
async function rows(user: Account) {
  const result = await user.client
    .from("tasks")
    .select("*")
    .order("onboarding_slot");
  expect(result.error).toBeNull();
  return result.data!;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});

describe("onboarding uses owned Plan tasks", () => {
  it("saves and corrects stable rows, then makes those same tasks editable in Plan", async () => {
    const a = await account();
    expect((await save(a, "complete", {}, 3)).error).not.toBeNull();
    const items = [
      { ...task, title: "\u00a0Reise planen\n" },
      { ...task, title: "😀".repeat(80), due_on: "2000-01-01" },
      { ...task, title: "Später", priority: "low", due_on: "2100-12-31" },
    ];
    expect(
      (await save(a, "tasks", { decision: "saved", items }, 3)).error,
    ).toBeNull();
    const first = await rows(a);
    expect(first).toHaveLength(3);
    expect(first[0]).toMatchObject({
      title: task.title,
      due_on: task.due_on,
      onboarding_slot: 0,
      revision: 0,
    });
    expect(
      (
        await a.client.rpc("mutate_task", {
          p_operation: "complete",
          p_id: first[0]!.id,
          p_revision: 0,
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await save(
          a,
          "tasks",
          {
            decision: "saved",
            items: [{ ...task, title: "Unterkunft suchen", due_on: "" }],
          },
          4,
        )
      ).error,
    ).toBeNull();
    const corrected = await rows(a);
    expect(corrected).toHaveLength(1);
    expect(corrected[0]).toMatchObject({
      id: first[0]!.id,
      title: "Unterkunft suchen",
      due_on: null,
    });
    expect(
      (
        await save(
          a,
          "tasks",
          {
            decision: "saved",
            items: [{ ...task, title: "Unterkunft suchen", due_on: "" }],
          },
          5,
        )
      ).error,
    ).toBeNull();
    expect(await rows(a)).toEqual(corrected);
    expect((await save(a, "complete", {}, 6)).error).toBeNull();
    expect(
      (
        await a.client.rpc("mutate_task", {
          p_operation: "complete",
          p_id: first[0]!.id,
          p_revision: 0,
        })
      ).error,
    ).toBeNull();
    expect((await rows(a))[0]).toMatchObject({
      id: first[0]!.id,
      revision: 1,
      completed_at: expect.any(String),
    });
    expect(
      (await save(a, "tasks", { decision: "skipped" }, 7)).error,
    ).not.toBeNull();
    expect(await rows(a)).toHaveLength(1);
  });
  it("rolls back partial edits and rejects malformed or forged task payloads", async () => {
    const a = await account();
    expect(
      (await save(a, "tasks", { decision: "saved", items: [task] }, 3)).error,
    ).toBeNull();
    const before = await rows(a);
    const badItems: Json[] = [
      null,
      23,
      {},
      { ...task, title: "\u00a0\n" },
      { ...task, title: "😀".repeat(81) },
      { ...task, priority: "urgent" },
      { ...task, due_on: "2027-02-29" },
      { ...task, due_on: "1999-12-31" },
      { ...task, due_on: "2026-10-11T12:00:00Z" },
      { ...task, due_on: null },
      { ...task, user_id: a.id },
      { ...task, id: before[0]!.id },
    ];
    for (const invalid of badItems)
      expect(
        (
          await save(
            a,
            "tasks",
            {
              decision: "saved",
              items: [{ ...task, title: "Must roll back" }, invalid],
            },
            4,
          )
        ).error,
      ).not.toBeNull();
    for (const payload of [
      { decision: "saved", items: [] },
      { decision: "saved", items: [task, task, task, task] },
      { decision: "saved", items: "invalid" },
      { decision: "saved", items: [task], user_id: a.id },
      { decision: "not_offered" },
    ])
      expect((await save(a, "tasks", payload, 4)).error).not.toBeNull();
    expect(await rows(a)).toEqual(before);
    expect(
      (await a.client.from("onboarding").select("revision").single()).data
        ?.revision,
    ).toBe(4);
  });
  it("isolates drafts across users and forbids direct writes or premature completion", async () => {
    const a = await account(),
      b = await account();
    for (const user of [a, b])
      expect(
        (await save(user, "tasks", { decision: "saved", items: [task] }, 3))
          .error,
      ).toBeNull();
    const foreign = await rows(b);
    expect(
      (await a.client.from("tasks").select("*").eq("user_id", b.id)).data,
    ).toEqual([]);
    expect(
      (await a.client.from("tasks").select("*").eq("id", foreign[0]!.id)).data,
    ).toEqual([]);
    expect(
      (
        await a.client
          .from("tasks")
          .update({ title: "Bypass" })
          .eq("id", foreign[0]!.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client.from("tasks").insert({
          id: foreign[0]!.id,
          user_id: a.id,
          title: "Bypass",
          priority: "normal",
          onboarding_slot: 0,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from("onboarding")
          .update({ tasks_status: "not_offered" })
          .eq("user_id", a.id)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("save_onboarding_step", {
          p_step: "tasks",
          p_payload: { decision: "skipped" },
          p_revision: 4,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await save(a, "tasks", { decision: "skipped" }, 4)).error,
    ).toBeNull();
    expect(await rows(a)).toEqual([]);
    expect(await rows(b)).toEqual(foreign);
    expect((await save(a, "complete", {}, 5)).error).toBeNull();
    const early = await createPlanFixture({ complete: false });
    users.push(early);
    expect(
      (await save(early, "tasks", { decision: "skipped" }, 0)).error,
    ).not.toBeNull();
    expect((await early.client.from("onboarding").select("*")).data).toEqual(
      [],
    );
  });
  it("serializes competing saves without duplicate tasks or losing the winning draft", async () => {
    const a = await account();
    const results = await Promise.all([
      save(a, "tasks", { decision: "saved", items: [task] }, 3),
      save(
        a,
        "tasks",
        { decision: "saved", items: [{ ...task, title: "Other tab" }] },
        3,
      ),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe("40001");
    const before = await rows(a);
    expect(before).toHaveLength(1);
    expect(
      (await save(a, "tasks", { decision: "skipped" }, 3)).error?.code,
    ).toBe("40001");
    expect(await rows(a)).toEqual(before);
  });
});
