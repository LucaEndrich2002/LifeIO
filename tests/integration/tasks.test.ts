import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import {
  createTask,
  mutateTask,
  readTasks,
  type TaskAccount,
} from "../supabase/task-fixtures";
const users: TaskAccount[] = [];
async function account(complete = true) {
  const user = await createPlanFixture({ complete });
  users.push(user);
  return user;
}
afterEach(async () => {
  await Promise.all(users.splice(0).map((user) => removeFixture(user.id)));
});

describe("owned tasks", () => {
  it("persists edits, completion, reopening and confirmed-path removal without changing finances", async () => {
    const user = await account();
    const before = await user.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    expect(before.error).toBeNull();
    const id = await createTask(user, "Lesen");
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "update",
          p_title: "Buch lesen",
          p_priority: "high",
          p_due_on: "2026-09-30",
        })
      ).error,
    ).toBeNull();
    expect((await readTasks(user)).items[0]).toMatchObject({
      id,
      title: "Buch lesen",
      priority: "high",
      due_on: "2026-09-30",
      revision: 1,
    });
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "complete",
          p_revision: 1,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "complete",
          p_revision: 1,
        })
      ).error,
    ).toBeNull();
    expect((await readTasks(user)).total).toBe(0);
    expect(
      (await readTasks(user, { p_status: "completed" })).items[0]?.completed_at,
    ).toBeTruthy();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "reopen",
          p_revision: 2,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "update",
          p_revision: 3,
          p_title: "Lesen",
          p_priority: "low",
          p_due_on: "",
        })
      ).error,
    ).toBeNull();
    expect(
      (await readTasks(user, { p_view: "undated" })).items[0],
    ).toMatchObject({ due_on: null, revision: 4 });
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "remove",
          p_revision: 4,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "remove",
          p_revision: 4,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "create",
          p_title: "Lesen",
        })
      ).error?.code,
    ).toBe("40001");
    expect((await readTasks(user)).items).toEqual([]);
    expect(
      (await user.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(before.data);
  });
  it("serializes repeat creates and rejects stale edits, status reversals and deletion", async () => {
    const user = await account();
    const id = randomUUID();
    const input = { p_id: id, p_operation: "create", p_title: "Original" };
    expect(
      (
        await Promise.all([mutateTask(user, input), mutateTask(user, input)])
      ).every((r) => !r.error),
    ).toBe(true);
    const edits = await Promise.all(
      ["Eins", "Zwei"].map((title) =>
        mutateTask(user, { p_id: id, p_operation: "update", p_title: title }),
      ),
    );
    expect(edits.filter((r) => !r.error)).toHaveLength(1);
    expect(edits.find((r) => r.error)?.error?.code).toBe("40001");
    for (const operation of ["remove", "complete"])
      expect(
        (await mutateTask(user, { p_id: id, p_operation: operation })).error
          ?.code,
      ).toBe("40001");
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "complete",
          p_revision: 1,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "reopen",
          p_revision: 2,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await mutateTask(user, {
          p_id: id,
          p_operation: "complete",
          p_revision: 1,
        })
      ).error?.code,
    ).toBe("40001");
    expect((await readTasks(user)).total).toBe(1);
  });
  it("enforces user isolation, permissions, anonymous denial and completed setup", async () => {
    const a = await account(),
      b = await account(),
      unfinished = await account(false);
    const id = await createTask(a, "Privat");
    expect(
      (await b.client.from("tasks").select("*").eq("id", id)).data,
    ).toEqual([]);
    expect((await readTasks(b)).total).toBe(0);
    for (const operation of ["update", "complete", "reopen", "remove"])
      expect(
        (
          await mutateTask(b, {
            p_id: id,
            p_operation: operation,
            p_title: "Fremd",
          })
        ).error?.code,
      ).toBe("42501");
    expect(
      (
        await a.client.from("tasks").insert({
          id: randomUUID(),
          user_id: b.id,
          title: "Fremd",
          priority: "normal",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (await a.client.from("tasks").update({ user_id: b.id }).eq("id", id))
        .error?.code,
    ).toBe("42501");
    expect(
      (await a.client.from("tasks").delete().eq("id", id)).error?.code,
    ).toBe("42501");
    expect(
      (await publicClient().from("tasks").select("*")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_task", {
          p_id: id,
          p_operation: "remove",
          p_revision: 0,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await publicClient().rpc("read_tasks", { p_day: "2026-09-28" })).error,
    ).not.toBeNull();
    expect(
      (
        await mutateTask(unfinished, {
          p_id: randomUUID(),
          p_operation: "create",
          p_title: "Früh",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (await unfinished.client.rpc("read_tasks", { p_day: "2026-09-28" })).error
        ?.code,
    ).toBe("42501");
    expect((await readTasks(a)).items[0]?.title).toBe("Privat");
  });
  it("validates direct RPC input without partial writes, including Unicode and real dates", async () => {
    const user = await account();
    const id = await createTask(user, "\u00a0🌿\u00a0", "2028-02-29");
    expect((await readTasks(user)).items[0]?.title).toBe("🌿");
    for (const change of [
      { p_title: "\u00a0" },
      { p_title: "🌿".repeat(81) },
      { p_priority: "urgent" },
      { p_due_on: "2026-02-29" },
      { p_due_on: "2101-01-01" },
      { p_due_on: "2026-1-01" },
      { p_revision: -1 },
      { p_operation: "toggle" },
    ])
      expect(
        (
          await mutateTask(user, {
            p_id: id,
            p_operation: "update",
            p_title: "Neu",
            ...change,
          })
        ).error,
      ).not.toBeNull();
    expect((await readTasks(user)).items[0]).toMatchObject({
      title: "🌿",
      revision: 0,
      due_on: "2028-02-29",
    });
    for (const change of [
      { p_day: "2026-02-29" },
      { p_day: "2101-01-01" },
      { p_view: "all_users" },
      { p_status: "any" },
      { p_page: -1 },
      { p_page: 1000001 },
    ])
      expect(
        (
          await user.client.rpc("read_tasks", {
            p_day: "2026-09-28",
            ...change,
          })
        ).error,
      ).not.toBeNull();
  });
  it("filters day and Monday-based week across New Year and keeps undated tasks findable", async () => {
    const user = await account();
    for (const day of [
      "2025-12-28",
      "2025-12-29",
      "2026-01-01",
      "2026-01-04",
      "2026-01-05",
    ])
      await createTask(user, day, day);
    const undated = await createTask(user, "Ohne Datum");
    expect(
      (
        await readTasks(user, { p_day: "2026-01-01", p_view: "week" })
      ).items.map((t) => t.due_on),
    ).toEqual(["2025-12-29", "2026-01-01", "2026-01-04"]);
    expect(
      (await readTasks(user, { p_day: "2026-01-01", p_view: "day" })).total,
    ).toBe(1);
    expect(
      (await readTasks(user, { p_view: "undated" })).items.map((t) => t.id),
    ).toEqual([undated]);
    expect((await readTasks(user)).total).toBe(6);
  });
  it("keeps inclusive week and day boundaries through DST, without timestamp shifts", async () => {
    const user = await account();
    for (const day of [
      "2026-03-23",
      "2026-03-29",
      "2026-03-30",
      "2026-10-19",
      "2026-10-25",
      "2026-10-26",
    ])
      await createTask(user, day, day);
    expect(
      (
        await readTasks(user, { p_day: "2026-03-29", p_view: "week" })
      ).items.map((t) => t.due_on),
    ).toEqual(["2026-03-23", "2026-03-29"]);
    expect(
      (
        await readTasks(user, { p_day: "2026-10-25", p_view: "week" })
      ).items.map((t) => t.due_on),
    ).toEqual(["2026-10-19", "2026-10-25"]);
    expect(
      (await readTasks(user, { p_day: "2026-10-25", p_view: "day" })).items.map(
        (t) => t.due_on,
      ),
    ).toEqual(["2026-10-25"]);
  });
  it("sorts by due date then priority and reports full counts beyond the first page", async () => {
    const user = await account();
    const later = await createTask(user, "Später", "2026-10-01", "high");
    for (const priority of ["low", "normal", "high"])
      await createTask(user, priority, "2026-09-28", priority);
    for (let i = 0; i < 22; i++) await createTask(user, `Ohne ${i}`);
    const first = await readTasks(user),
      last = await readTasks(user, { p_page: 1 });
    expect(first.total).toBe(26);
    expect(first.items).toHaveLength(25);
    expect(last.total).toBe(26);
    expect(last.items).toHaveLength(1);
    expect(first.items.slice(0, 3).map((t) => t.priority)).toEqual([
      "high",
      "normal",
      "low",
    ]);
    expect(first.items[3]?.id).toBe(later);
    expect(new Set([...first.items, ...last.items].map((t) => t.id)).size).toBe(
      26,
    );
    expect((await readTasks(user, { p_page: 2 })).items).toEqual([]);
    expect((await readTasks(user, { p_view: "undated" })).total).toBe(22);
  });
});
