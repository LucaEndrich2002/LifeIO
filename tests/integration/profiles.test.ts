import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFixture,
  publicClient,
  removeFixture,
} from "../supabase/fixtures";

let a: Awaited<ReturnType<typeof createFixture>>;
let b: Awaited<ReturnType<typeof createFixture>>;
const values = {
  display_name: "Fixture profile",
  time_zone: "Europe/Berlin",
  currency: "EUR",
};

beforeAll(async () => {
  a = await createFixture();
  b = await createFixture();
});
afterAll(async () => {
  if (a) await removeFixture(a.id);
  if (b) await removeFixture(b.id);
});

describe("profiles through the public Data API", () => {
  it("allows owners to save idempotently and read their own profile", async () => {
    for (const fixture of [a, b]) {
      const row = { ...values, user_id: fixture.id };
      expect(
        (await fixture.client.from("profiles").upsert(row)).error,
      ).toBeNull();
      expect(
        (await fixture.client.from("profiles").upsert(row)).error,
      ).toBeNull();
      const read = await fixture.client.from("profiles").select("*");
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(1);
      expect(read.data?.[0]?.user_id).toBe(fixture.id);
    }
  });
  it("does not disclose another user's profile even by exact ID", async () => {
    const result = await a.client
      .from("profiles")
      .select("*")
      .eq("user_id", b.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
  it("prevents foreign inserts, updates, upserts and ownership changes", async () => {
    expect(
      (await a.client.from("profiles").insert({ ...values, user_id: b.id }))
        .error,
    ).not.toBeNull();
    const update = await a.client
      .from("profiles")
      .update({ display_name: "Unwanted change" })
      .eq("user_id", b.id)
      .select();
    expect(update.error).toBeNull();
    expect(update.data).toEqual([]);
    expect(
      (
        await a.client
          .from("profiles")
          .upsert({ ...values, user_id: b.id, display_name: "Unwanted change" })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client
          .from("profiles")
          .update({ user_id: b.id })
          .eq("user_id", a.id)
      ).error,
    ).not.toBeNull();
    expect(
      (await b.client.from("profiles").select("display_name").single()).data
        ?.display_name,
    ).toBe(values.display_name);
  });
  it("rejects anonymous reads and writes and has no user-accessible delete operation", async () => {
    const anonymous = publicClient();
    expect((await anonymous.from("profiles").select("*")).error).not.toBeNull();
    expect(
      (await anonymous.from("profiles").insert({ ...values, user_id: a.id }))
        .error,
    ).not.toBeNull();
    expect(
      (await a.client.from("profiles").delete().eq("user_id", a.id)).error,
    ).not.toBeNull();
  });
  it("enforces validation and immutable timestamps against direct API requests", async () => {
    for (const change of [
      { currency: "USD" },
      { time_zone: "not-a-time-zone" },
      { display_name: " " },
      { display_name: "x".repeat(81) },
      { created_at: "2000-01-01T00:00:00Z" },
    ]) {
      expect(
        (await a.client.from("profiles").update(change).eq("user_id", a.id))
          .error,
      ).not.toBeNull();
    }
    expect(
      (
        await a.client
          .from("profiles")
          .update({ display_name: "Changed", time_zone: "UTC" })
          .eq("user_id", a.id)
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client
          .from("profiles")
          .select("display_name,time_zone")
          .single()
      ).data,
    ).toEqual({ display_name: "Changed", time_zone: "UTC" });
  });
  it("does not allow access after a local sign-out", async () => {
    expect((await a.client.auth.signOut({ scope: "local" })).error).toBeNull();
    expect((await a.client.from("profiles").select("*")).error).not.toBeNull();
  });
});
