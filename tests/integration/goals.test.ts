import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import { goalSnapshotSchema } from "../../src/domain/goals";
import { moneySnapshotSchema } from "../../src/domain/transactions";
import type { Json } from "../../src/types/database";

type Account = Awaited<ReturnType<typeof createPlanFixture>>;
const users: Account[] = [];
async function account(options?: Parameters<typeof createPlanFixture>[0]) {
  const user = await createPlanFixture(options);
  users.push(user);
  return user;
}
afterEach(async () => {
  for (const user of users.splice(0)) await removeFixture(user.id);
});
const input = {
  name: "Reise",
  target: 100000,
  opening: 10000,
  monthly: 10000,
  month: "2026-09",
  deadline: "2027-08-01",
};
const contribution = { amount: 5000, date: "2026-01-15", note: "Einzahlung" };
const mutate = (
  a: Account,
  operation: string,
  id: string,
  payload: Json = input,
  revision = 0,
  entryId: string = randomUUID(),
) =>
  a.client.rpc("mutate_goal", {
    p_operation: operation,
    p_id: id,
    p_entry_id: entryId,
    p_revision: revision,
    p_payload: payload,
  });
async function goal(a: Account, id: string, page = 0) {
  const r = await a.client.rpc("read_goal", { p_id: id, p_page: page });
  expect(r.error).toBeNull();
  return goalSnapshotSchema.parse(r.data);
}
async function month(a: Account, value = "2026-09") {
  const r = await a.client.rpc("read_money_month", { p_month: value });
  expect(r.error).toBeNull();
  return moneySnapshotSchema.parse(r.data);
}
async function original(a: Account) {
  const r = await a.client.from("goals").select("id").single();
  expect(r.error).toBeNull();
  return r.data!.id;
}

describe("saving goal management, contribution ledger and rate history", () => {
  it("seals onboarding rates once and creates additional goals without duplicate plans", async () => {
    const a = await account();
    const oldId = await original(a);
    expect((await goal(a, oldId)).rates).toEqual([
      { month: "2026-09-01", amount_minor: 50000 },
    ]);
    expect(
      (
        await a.client.rpc("save_onboarding_step", {
          p_step: "complete",
          p_payload: {},
          p_revision: 4,
        })
      ).error,
    ).toBeNull();
    expect((await goal(a, oldId)).rates).toHaveLength(1);
    const id = randomUUID();
    const created = await Promise.all([
      mutate(a, "create", id),
      mutate(a, "create", id),
    ]);
    expect(created.every((r) => !r.error)).toBe(true);
    expect((await month(a)).goal_count).toBe(2);
    expect((await month(a)).totals.savings).toBe(60000);
    expect((await month(a, "2026-08")).totals.savings).toBe(0);
    expect((await goal(a, id)).balance).toBe(10000);
  });
  it("changes names and opening balances while preserving earlier planned rates, including a zero-rate pause", async () => {
    const a = await account({ skipGoal: true });
    const id = randomUUID();
    expect((await mutate(a, "create", id)).error).toBeNull();
    const update = {
      ...input,
      name: "Reise neu",
      monthly: 20000,
      month: "2026-10",
    };
    expect((await mutate(a, "update", id, update)).error).toBeNull();
    expect((await month(a)).totals.savings).toBe(10000);
    expect((await month(a, "2026-10")).totals.savings).toBe(20000);
    expect(
      (await mutate(a, "update", id, { ...update, opening: 12345 }, 1)).error,
    ).toBeNull();
    expect((await goal(a, id)).rates).toHaveLength(2);
    expect((await goal(a, id)).balance).toBe(12345);
    expect(
      (
        await mutate(
          a,
          "update",
          id,
          { ...update, monthly: 0, month: "2026-12" },
          2,
        )
      ).error,
    ).toBeNull();
    expect((await month(a, "2026-12")).totals.savings).toBe(0);
    expect((await month(a, "2026-11")).totals.savings).toBe(20000);
    expect(
      (await mutate(a, "update", id, { ...update, monthly: 30000 }, 3)).error,
    ).not.toBeNull();
  });
  it("counts real contributions once, keeps cancellations in history and never deducts deposits again in Money", async () => {
    const a = await account();
    const id = await original(a);
    const entry = randomUUID();
    const before = await month(a);
    const created = await Promise.all([
      mutate(a, "contribute", id, contribution, 0, entry),
      mutate(a, "contribute", id, contribution, 0, entry),
    ]);
    expect(created.every((r) => !r.error)).toBe(true);
    expect((await goal(a, id)).balance).toBe(355000);
    expect((await goal(a, id)).entries).toHaveLength(1);
    expect(
      (await a.client.from("goal_rates").select("currency").eq("goal_id", id))
        .data,
    ).toEqual([{ currency: "EUR" }]);
    expect(
      (
        await a.client
          .from("goal_contributions")
          .select("currency")
          .eq("id", entry)
      ).data,
    ).toEqual([{ currency: "EUR" }]);
    expect((await month(a)).totals).toEqual(before.totals);
    expect((await mutate(a, "cancel", id, {}, 1, entry)).error).toBeNull();
    expect((await mutate(a, "cancel", id, {}, 1, entry)).error).toBeNull();
    expect((await goal(a, id)).balance).toBe(350000);
    expect((await goal(a, id)).entries[0]!.cancelled_at).not.toBeNull();
    expect(
      (await mutate(a, "contribute", id, contribution, 2, entry)).error?.code,
    ).toBe("40001");
  });
  it("includes all contributions beyond the first page in the exact balance", async () => {
    const a = await account();
    const id = await original(a);
    for (let i = 0; i < 28; i++)
      expect(
        (await mutate(a, "contribute", id, { ...contribution, amount: 101 }, i))
          .error,
      ).toBeNull();
    const first = await goal(a, id);
    const second = await goal(a, id, 1);
    expect(first.balance).toBe(352828);
    expect(second.balance).toBe(first.balance);
    expect(first.entries).toHaveLength(25);
    expect(second.entries).toHaveLength(3);
    expect(
      new Set([...first.entries, ...second.entries].map((row) => row.id)).size,
    ).toBe(28);
  });
  it("rejects stale metadata, deposits and cancellations without partial writes", async () => {
    const a = await account();
    const id = randomUUID();
    const entry = randomUUID();
    expect((await mutate(a, "create", id)).error).toBeNull();
    const results = await Promise.all([
      mutate(a, "update", id, { ...input, name: "A" }),
      mutate(a, "contribute", id, contribution, 0, entry),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.code).toBe("40001");
    const snapshot = await goal(a, id);
    expect(snapshot.goal.revision).toBe(1);
    expect((await mutate(a, "update", id, input, 0)).error?.code).toBe("40001");
    if (snapshot.entries.length)
      expect((await mutate(a, "cancel", id, {}, 0, entry)).error?.code).toBe(
        "40001",
      );
  });
  it("blocks foreign goals and contributions, direct writes, owner spoofing and anonymous access", async () => {
    const a = await account();
    const b = await account();
    const aid = await original(a);
    const bid = await original(b);
    const entry = randomUUID();
    expect(
      (await mutate(b, "contribute", bid, contribution, 0, entry)).error,
    ).toBeNull();
    expect((await a.client.rpc("read_goal", { p_id: bid })).data).toBeNull();
    for (const operation of ["create", "update", "contribute", "cancel"])
      expect(
        (
          await mutate(
            a,
            operation,
            bid,
            operation === "contribute" ? contribution : input,
            0,
            entry,
          )
        ).error,
      ).not.toBeNull();
    expect((await mutate(a, "cancel", aid, {}, 0, entry)).error).not.toBeNull();
    expect(
      (await mutate(a, "contribute", aid, contribution, 0, entry)).error,
    ).not.toBeNull();
    for (const table of ["goal_rates", "goal_contributions"] as const)
      expect(
        (await a.client.from(table).select("*").eq("goal_id", bid)).data,
      ).toEqual([]);
    expect(
      (await a.client.from("goals").update({ current_minor: 1 }).eq("id", aid))
        .error,
    ).not.toBeNull();
    expect(
      (
        await a.client.from("goal_rates").insert({
          goal_id: aid,
          user_id: a.id,
          month: "2026-10-01",
          amount_minor: 1,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client.from("goal_contributions").insert({
          id: randomUUID(),
          goal_id: bid,
          user_id: a.id,
          paid_on: "2026-01-01",
          amount_minor: 1,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from("goal_contributions")
          .update({ cancelled_at: new Date().toISOString() })
          .eq("id", entry)
      ).error,
    ).not.toBeNull();
    expect(
      (await a.client.from("goal_contributions").delete().eq("id", entry))
        .error,
    ).not.toBeNull();
    const ownEntry = randomUUID();
    expect(
      (
        await mutate(
          a,
          "contribute",
          aid,
          { ...contribution, user_id: b.id, goal_id: bid },
          0,
          ownEntry,
        )
      ).error,
    ).toBeNull();
    expect((await goal(b, bid)).balance).toBe(355000);
    expect(
      (await publicClient().rpc("read_goal", { p_id: aid })).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_goal", {
          p_operation: "create",
          p_id: randomUUID(),
          p_entry_id: randomUUID(),
          p_revision: 0,
          p_payload: input,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (await publicClient().from("goal_contributions").select("*")).error,
    ).not.toBeNull();
  });
  it("enforces completion, money bounds, real dates and a non-future date in the profile zone", async () => {
    const incomplete = await account({ complete: false });
    expect(
      (await mutate(incomplete, "create", randomUUID())).error,
    ).not.toBeNull();
    const a = await account();
    const id = randomUUID();
    for (const change of [
      { target: 0 },
      { opening: -1 },
      { monthly: 1.1 },
      { target: 100000000000 },
      { deadline: "2026-02-29" },
      { month: "2101-01" },
      { name: " " },
    ])
      expect(
        (await mutate(a, "create", randomUUID(), { ...input, ...change }))
          .error,
      ).not.toBeNull();
    expect(
      (await mutate(a, "create", id, { ...input, opening: 99999999999 })).error,
    ).toBeNull();
    expect((await mutate(a, "contribute", id, contribution)).error?.code).toBe(
      "22003",
    );
    expect((await goal(a, id)).entries).toHaveLength(0);
    expect((await mutate(a, "update", id, input)).error).toBeNull();
    for (const change of [
      { amount: 0 },
      { amount: -1 },
      { amount: 0.1 },
      { date: "2026-02-29" },
      { date: "2100-12-31" },
      { note: "x".repeat(81) },
    ])
      expect(
        (await mutate(a, "contribute", id, { ...contribution, ...change }, 1))
          .error,
      ).not.toBeNull();
    const clock = new Date();
    const zone = "Pacific/Kiritimati";
    expect(
      (
        await a.client
          .from("profiles")
          .update({ time_zone: zone })
          .eq("user_id", a.id)
      ).error,
    ).toBeNull();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(clock);
    const date = ["year", "month", "day"]
      .map((type) => parts.find((p) => p.type === type)!.value)
      .join("-");
    expect(
      (await mutate(a, "contribute", id, { ...contribution, date }, 1)).error,
    ).toBeNull();
    expect(
      (await mutate(a, "update", id, { ...input, opening: 99999999999 }, 2))
        .error?.code,
    ).toBe("22003");
  });
});
