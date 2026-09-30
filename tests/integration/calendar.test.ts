import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { publicClient, removeFixture } from "../supabase/fixtures";
import {
  createEvent,
  mutateEvent,
  readEvents,
  eventTimes,
  type CalendarAccount,
} from "../supabase/calendar-fixtures";
import { calendarDays } from "../../src/domain/calendar-time";
const users: CalendarAccount[] = [];
async function account(complete = true) {
  const user = await createPlanFixture({ complete });
  users.push(user);
  return user;
}
afterEach(async () => {
  await Promise.all(users.splice(0).map((user) => removeFixture(user.id)));
});
describe("owned calendar events", () => {
  it("persists edits and removal, prevents resurrection and leaves finances unchanged", async () => {
    const user = await account();
    const before = await user.client.rpc("read_money_month", {
      p_month: "2026-09",
    });
    expect(before.error).toBeNull();
    const id = await createEvent(user, "\u00a0🌿\u00a0");
    expect((await readEvents(user)).items[0]?.title).toBe("🌿");
    expect(
      (
        await mutateEvent(user, {
          p_id: id,
          p_operation: "update",
          p_title: "Reise planen",
          p_ends_at: "2026-09-30T01:00:00Z",
          p_time_zone: "UTC",
        })
      ).error,
    ).toBeNull();
    expect((await readEvents(user)).items[0]).toMatchObject({
      id,
      title: "Reise planen",
      time_zone: "UTC",
      revision: 1,
    });
    for (let i = 0; i < 2; i++)
      expect(
        (
          await mutateEvent(user, {
            p_id: id,
            p_operation: "remove",
            p_revision: 1,
          })
        ).error,
      ).toBeNull();
    expect((await readEvents(user)).total).toBe(0);
    expect(
      (await user.client.from("calendar_events").select("*").eq("id", id)).data,
    ).toEqual([]);
    expect(
      (
        await mutateEvent(user, {
          p_id: id,
          p_operation: "create",
          p_title: "🌿",
        })
      ).error?.code,
    ).toBe("40001");
    expect(
      (await user.client.rpc("read_money_month", { p_month: "2026-09" })).data,
    ).toEqual(before.data);
  });
  it("serializes repeat creates and rejects stale edits and deletes", async () => {
    const user = await account(),
      id = randomUUID();
    const args = { p_id: id, p_operation: "create", p_title: "Original" };
    expect(
      (
        await Promise.all([mutateEvent(user, args), mutateEvent(user, args)])
      ).every((r) => !r.error),
    ).toBe(true);
    const edits = await Promise.all(
      ["Eins", "Zwei"].map((p_title) =>
        mutateEvent(user, { p_id: id, p_operation: "update", p_title }),
      ),
    );
    expect(edits.filter((r) => !r.error)).toHaveLength(1);
    expect(edits.find((r) => r.error)?.error?.code).toBe("40001");
    expect(
      (await mutateEvent(user, { p_id: id, p_operation: "remove" })).error
        ?.code,
    ).toBe("40001");
    expect((await readEvents(user)).total).toBe(1);
  });
  it("enforces ownership, direct-write denial, anonymous denial and completed onboarding", async () => {
    const a = await account(),
      b = await account(),
      unfinished = await account(false);
    const id = await createEvent(a, "Privat");
    expect(
      (await b.client.from("calendar_events").select("*").eq("id", id)).data,
    ).toEqual([]);
    expect((await readEvents(b)).total).toBe(0);
    for (const operation of ["update", "remove"])
      expect(
        (
          await mutateEvent(b, {
            p_id: id,
            p_operation: operation,
            p_title: "Fremd",
          })
        ).error?.code,
      ).toBe("42501");
    expect(
      (
        await a.client.from("calendar_events").insert({
          id: randomUUID(),
          user_id: b.id,
          title: "Fremd",
          starts_at: eventTimes.p_starts_at,
          ends_at: eventTimes.p_ends_at,
          time_zone: "UTC",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await a.client
          .from("calendar_events")
          .update({ user_id: b.id })
          .eq("id", id)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await a.client.from("calendar_events").delete().eq("id", id)).error
        ?.code,
    ).toBe("42501");
    expect(
      (await publicClient().from("calendar_events").select("*")).error,
    ).not.toBeNull();
    expect(
      (
        await publicClient().rpc("mutate_calendar_event", {
          p_id: id,
          p_operation: "remove",
          p_revision: 0,
        })
      ).error,
    ).not.toBeNull();
    const range = {
      p_start: eventTimes.p_starts_at,
      p_end: eventTimes.p_ends_at,
    };
    expect(
      (await publicClient().rpc("read_calendar_events", range)).error,
    ).not.toBeNull();
    expect(
      (await unfinished.client.rpc("read_calendar_events", range)).error?.code,
    ).toBe("42501");
    expect(
      (
        await mutateEvent(unfinished, {
          p_id: randomUUID(),
          p_operation: "create",
          p_title: "Früh",
        })
      ).error?.code,
    ).toBe("42501");
    expect((await readEvents(a)).items[0]?.title).toBe("Privat");
  });
  it("rejects invalid direct input atomically, including precision and local date bounds", async () => {
    const user = await account(),
      id = await createEvent(user, "Original");
    for (const change of [
      { p_title: "\u00a0" },
      { p_title: "🌿".repeat(81) },
      { p_time_zone: "Mars/Olympus" },
      { p_starts_at: "infinity" },
      { p_ends_at: "infinity" },
      { p_starts_at: eventTimes.p_ends_at },
      { p_ends_at: "2026-09-28T21:29:00Z" },
      { p_ends_at: "2026-09-29T22:00:01Z" },
      { p_starts_at: "1999-12-31T22:00:00Z" },
      { p_ends_at: "2100-12-31T23:00:00Z" },
      { p_revision: -1 },
      { p_operation: "toggle" },
    ]) {
      expect(
        (
          await mutateEvent(user, {
            p_id: id,
            p_operation: "update",
            p_title: "Neu",
            ...change,
          })
        ).error,
      ).not.toBeNull();
    }
    expect((await readEvents(user)).items[0]).toMatchObject({
      title: "Original",
      revision: 0,
    });
    for (const change of [
      { p_start: "infinity" },
      { p_end: "infinity" },
      { p_end: "2026-09-01T00:00:00Z" },
      { p_end: "2027-01-01T00:00:00Z" },
      { p_page: -1 },
      { p_page: 1000001 },
      { p_start: "1999-01-01T00:00:00Z", p_end: "1999-01-02T00:00:00Z" },
    ])
      expect(
        (
          await user.client.rpc("read_calendar_events", {
            p_start: eventTimes.p_starts_at,
            p_end: eventTimes.p_ends_at,
            ...change,
          })
        ).error,
      ).not.toBeNull();
    await createEvent(user, "Jahrgrenze", {
      p_starts_at: "1999-12-31T10:00:00Z",
      p_ends_at: "1999-12-31T11:00:00Z",
      p_time_zone: "Pacific/Kiritimati",
    });
    expect(
      (
        await readEvents(user, {
          p_start: "1999-12-30T11:00:00Z",
          p_end: "1999-12-31T11:00:00Z",
        })
      ).total,
    ).toBe(1);
  });
  it("uses half-open overlaps over midnight, New Year and daylight-saving days", async () => {
    const user = await account();
    await createEvent(user);
    for (const [day, total] of [
      ["2026-09-28", 1],
      ["2026-09-29", 1],
      ["2026-09-30", 0],
    ] as const) {
      const [range] = calendarDays(
        { day, view: "day", page: 0 },
        "Europe/Berlin",
      );
      expect(
        (await readEvents(user, { p_start: range!.start, p_end: range!.end }))
          .total,
      ).toBe(total);
    }
    for (const [day, start, end] of [
      ["2026-03-29", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
      ["2026-10-25", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
      ["2026-01-01", "2025-12-31T23:00:00Z", "2026-01-01T23:00:00Z"],
    ] as const) {
      const id = await createEvent(user, day, {
        p_starts_at: start,
        p_ends_at: end,
      });
      const [range] = calendarDays(
        { day, view: "day", page: 0 },
        "Europe/Berlin",
      );
      expect(
        (
          await readEvents(user, { p_start: range!.start, p_end: range!.end })
        ).items.map((e) => e.id),
      ).toEqual([id]);
      expect((await readEvents(user, { p_start: end, p_end: end })).total).toBe(
        0,
      );
    }
  });
  it("preserves instants and event zones when the profile zone changes", async () => {
    const user = await account();
    await createEvent(user, "Nacht", {
      p_starts_at: "2026-09-29T00:30:00Z",
      p_ends_at: "2026-09-29T01:00:00Z",
    });
    const before = await readEvents(user);
    expect(
      (
        await user.client
          .from("profiles")
          .update({ time_zone: "America/Los_Angeles" })
          .eq("user_id", user.id)
      ).error,
    ).toBeNull();
    expect(await readEvents(user)).toEqual(before);
    for (const [zone, total] of [
      ["Europe/Berlin", 0],
      ["America/Los_Angeles", 1],
    ] as const) {
      const [range] = calendarDays(
        { day: "2026-09-28", view: "day", page: 0 },
        zone,
      );
      expect(
        (await readEvents(user, { p_start: range!.start, p_end: range!.end }))
          .total,
      ).toBe(total);
    }
  });
  it("paginates distinct spanning events with complete counts and stable tie ordering", async () => {
    const user = await account();
    for (let i = 0; i < 26; i++) await createEvent(user, `Termin ${i}`);
    const first = await readEvents(user),
      last = await readEvents(user, { p_page: 1 });
    expect(first.total).toBe(26);
    expect(last.total).toBe(26);
    expect(first.items).toHaveLength(25);
    expect(last.items).toHaveLength(1);
    const ids = [...first.items, ...last.items].map((e) => e.id);
    expect(new Set(ids).size).toBe(26);
    expect(ids).toEqual([...ids].sort());
    expect((await readEvents(user, { p_page: 2 })).items).toEqual([]);
  });
});
