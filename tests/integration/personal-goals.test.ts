import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import { personalGoalSchema } from "../../src/domain/personal-goals";
import { milestoneSnapshotSchema } from "../../src/domain/milestones";

type Account = Awaited<ReturnType<typeof createPlanFixture>>;
const users: Account[] = [];
async function account(options?: Parameters<typeof createPlanFixture>[0]) {
  const a = await createPlanFixture(options);
  users.push(a);
  return a;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
const mutate = (
  a: Account,
  id: string,
  operation = "create",
  revision = 0,
  name = "Sprache lernen",
  deadline = "",
) =>
  a.client.rpc("mutate_personal_goal", {
    p_operation: operation,
    p_id: id,
    p_revision: revision,
    p_name: name,
    p_deadline: deadline,
  });
async function read(a: Account, id: string) {
  const r = await a.client.from("goals").select("*").eq("id", id).single();
  expect(r.error).toBeNull();
  return r.data!;
}

describe("personal goal persistence and financial separation", () => {
  it("stores no money, rejects financial mutations and leaves the entire Money snapshot unchanged", async () => {
    const a = await account();
    const before = await a.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    expect(before.error).toBeNull();
    const id = randomUUID();
    expect((await mutate(a, id)).error).toBeNull();
    expect(await read(a, id)).toMatchObject({
      kind: "personal",
      name: "Sprache lernen",
      target_minor: null,
      current_minor: null,
      monthly_minor: null,
      currency: null,
      onboarding_slot: null,
    });
    for (const operation of ["create", "update", "contribute", "cancel"]) {
      expect(
        (
          await a.client.rpc("mutate_goal", {
            p_operation: operation,
            p_id: id,
            p_entry_id: randomUUID(),
            p_revision: 0,
            p_payload: {
              name: "Sparen",
              target: 10000,
              opening: 0,
              monthly: 100,
              month: "2026-09",
              deadline: "",
              amount: 100,
              date: "2026-01-01",
              note: "",
            },
          })
        ).error?.code,
      ).toBe("42501");
    }
    expect((await a.client.rpc("read_goal", { p_id: id })).data).toBeNull();
    expect(
      (await a.client.from("goal_rates").select("*").eq("goal_id", id)).data,
    ).toEqual([]);
    expect(
      (await a.client.from("goal_contributions").select("*").eq("goal_id", id))
        .data,
    ).toEqual([]);
    expect(
      (await a.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(before.data);
  });
  it("deduplicates creation, detects competing updates and preserves kind", async () => {
    const a = await account();
    const id = randomUUID();
    expect(
      (await Promise.all([mutate(a, id), mutate(a, id)])).every(
        (r) => !r.error,
      ),
    ).toBe(true);
    const concurrent = await Promise.all([
      mutate(a, id, "update", 0, "Lesen", "2028-02-29"),
      mutate(a, id, "update", 0, "Schreiben", "2027-01-01"),
    ]);
    expect(concurrent.filter((r) => !r.error)).toHaveLength(1);
    expect(concurrent.find((r) => r.error)?.error?.code).toBe("40001");
    expect((await mutate(a, id)).error?.code).toBe("40001");
    expect(
      (await mutate(a, id, "update", 1, "  Lernen  ", "")).error,
    ).toBeNull();
    expect(personalGoalSchema.parse(await read(a, id))).toMatchObject({
      name: "Lernen",
      deadline: null,
      revision: 2,
      kind: "personal",
    });
    const financial = await a.client
      .from("goals")
      .select("id")
      .eq("kind", "financial")
      .single();
    expect((await mutate(a, financial.data!.id, "update", 0)).error?.code).toBe(
      "42501",
    );
    expect((await mutate(a, financial.data!.id)).error?.code).toBe("42501");
  });
  it("reuses milestone progress, including reopening and removal, without changing goal metadata", async () => {
    const a = await account();
    const id = randomUUID();
    const entry = randomUUID();
    expect((await mutate(a, id)).error).toBeNull();
    const before = await read(a, id);
    const args = {
      p_goal_id: id,
      p_id: entry,
      p_revision: 0,
      p_title: "Erster Kurs",
    };
    expect(
      (
        await a.client.rpc("mutate_goal_milestone", {
          ...args,
          p_operation: "create",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client.rpc("mutate_goal_milestone", {
          ...args,
          p_operation: "complete",
        })
      ).error,
    ).toBeNull();
    const snapshot = await a.client.rpc("read_goal_milestones", {
      p_goal_id: id,
    });
    expect(milestoneSnapshotSchema.parse(snapshot.data)).toMatchObject({
      total: 1,
      completed: 1,
    });
    expect(await read(a, id)).toEqual(before);
    expect(
      (
        await a.client.rpc("mutate_goal_milestone", {
          ...args,
          p_revision: 1,
          p_operation: "reopen",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client.rpc("mutate_goal_milestone", {
          ...args,
          p_revision: 2,
          p_operation: "remove",
        })
      ).error,
    ).toBeNull();
    expect(
      milestoneSnapshotSchema.parse(
        (await a.client.rpc("read_goal_milestones", { p_goal_id: id })).data,
      ),
    ).toMatchObject({ total: 0, completed: 0 });
  });
  it("isolates users and blocks direct writes, anonymous requests and incomplete onboarding", async () => {
    const a = await account();
    const b = await account();
    const unfinished = await account({ complete: false });
    const id = randomUUID();
    expect((await mutate(a, id)).error).toBeNull();
    expect(
      (await b.client.from("goals").select("*").eq("id", id)).data,
    ).toEqual([]);
    expect((await mutate(b, id, "update")).error?.code).toBe("42501");
    expect((await mutate(b, id)).error).not.toBeNull();
    expect(
      (await b.client.rpc("read_goal_milestones", { p_goal_id: id })).data,
    ).toBeNull();
    expect(
      (
        await b.client.rpc("mutate_goal_milestone", {
          p_operation: "create",
          p_goal_id: id,
          p_id: randomUUID(),
          p_revision: 0,
          p_title: "Fremd",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await a.client
          .from("goals")
          .insert({ user_id: a.id, kind: "personal", name: "Direkt" })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await a.client
          .from("goals")
          .update({ kind: "financial", target_minor: 10000 })
          .eq("id", id)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await a.client.from("goals").delete().eq("id", id)).error?.code,
    ).toBe("42501");
    expect(
      (
        await publicClient().rpc("mutate_personal_goal", {
          p_operation: "create",
          p_id: randomUUID(),
          p_revision: 0,
          p_name: "Anonym",
        })
      ).error,
    ).not.toBeNull();
    expect((await mutate(unfinished, randomUUID())).error?.code).toBe("42501");
    expect((await read(a, id)).name).toBe("Sprache lernen");
  });
  it("validates names, real dates, revisions and operations at the database boundary", async () => {
    const a = await account();
    for (const name of ["", "\t\u00a0\ufeff", "🎯".repeat(81)])
      expect(
        (await mutate(a, randomUUID(), "create", 0, name)).error,
      ).not.toBeNull();
    for (const deadline of [
      "2027-02-29",
      "2026-04-31",
      "1999-12-31",
      "2101-01-01",
      "2026-9-1",
    ])
      expect(
        (await mutate(a, randomUUID(), "create", 0, "Datum", deadline)).error,
      ).not.toBeNull();
    expect((await mutate(a, randomUUID(), "delete")).error?.code).toBe("22023");
    for (const revision of [-1, 1, 2147483647])
      expect(
        (await mutate(a, randomUUID(), "create", revision)).error?.code,
      ).toBe("22023");
    const id = randomUUID();
    expect(
      (
        await mutate(
          a,
          id,
          "create",
          0,
          `\t${"🎯".repeat(80)}\u00a0`,
          "2028-02-29",
        )
      ).error,
    ).toBeNull();
    expect((await read(a, id)).name).toBe("🎯".repeat(80));
  });
  it("paginates personal goals independently of financial goals and keeps Money empty when only personal goals exist", async () => {
    const a = await account({ skipGoal: true });
    const before = await a.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    const ids: string[] = [];
    for (let i = 0; i < 26; i++) {
      const id = randomUUID();
      ids.push(id);
      expect(
        (await mutate(a, id, "create", 0, `Ziel ${i + 1}`)).error,
      ).toBeNull();
    }
    const first = await a.client
      .from("goals")
      .select("id", { count: "exact" })
      .eq("kind", "personal")
      .order("created_at", { ascending: false })
      .order("id")
      .range(0, 24);
    const second = await a.client
      .from("goals")
      .select("id")
      .eq("kind", "personal")
      .order("created_at", { ascending: false })
      .order("id")
      .range(25, 49);
    expect(first.count).toBe(26);
    expect(first.data).toHaveLength(25);
    expect(first.data?.[0]?.id).toBe(ids.at(-1));
    expect(second.data).toEqual([{ id: ids[0] }]);
    expect(
      (await a.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(before.data);
  });
});
