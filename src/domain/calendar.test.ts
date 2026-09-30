import { describe, expect, it } from "vitest";
import {
  calendarInputSchema,
  calendarMutationSchema,
  calendarHref,
} from "./calendar";
import {
  calendarInstants,
  calendarLocal,
  calendarDays,
  calendarOverlaps,
  calendarDayInZone,
} from "./calendar-time";
const input = {
  title: "Termin",
  time_zone: "Europe/Berlin",
  start_local: "2026-09-29T10:00",
  end_local: "2026-09-29T11:00",
  start_occurrence: "auto",
  end_occurrence: "auto",
} as const;
describe("calendar intervals", () => {
  it("validates titles, real minute-precision dates, zones and bounded navigation", () => {
    expect(
      calendarInputSchema.parse({ ...input, title: "\u00a0🌿\u00a0" }).title,
    ).toBe("🌿");
    for (const change of [
      { title: "🌿".repeat(81) },
      { title: "\u00a0" },
      { time_zone: "Mars/Olympus" },
      { start_local: "2026-02-29T10:00" },
      { end_local: "2026-09-29T24:00" },
      { end_local: "2101-01-01T00:00" },
      { end_local: "2026-09-29T10:00:01" },
      { start_occurrence: "guess" },
    ])
      expect(
        calendarInputSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    expect(
      calendarMutationSchema.safeParse({
        id: "wrong",
        revision: 0,
        operation: "create",
        day: "2026-09-29",
      }).success,
    ).toBe(false);
    expect(() =>
      calendarHref({ view: "week", day: "2026-09-29", page: -1 }),
    ).toThrow();
  });
  it("rejects gaps and requires an explicit choice for repeated times", () => {
    expect(() =>
      calendarInstants({
        ...input,
        start_local: "2026-03-29T02:30",
        end_local: "2026-03-29T04:00",
      }),
    ).toThrow("existiert");
    const fold = {
      ...input,
      start_local: "2026-10-25T02:30",
      end_local: "2026-10-25T03:30",
    };
    expect(() => calendarInstants(fold)).toThrow("zweimal");
    expect(
      calendarInstants({ ...fold, start_occurrence: "earlier" }).starts_at,
    ).toBe("2026-10-25T00:30:00Z");
    expect(
      calendarInstants({ ...fold, start_occurrence: "later" }).starts_at,
    ).toBe("2026-10-25T01:30:00Z");
  });
  it("compares actual instants and preserves both occurrences when editing", () => {
    const fold = {
      ...input,
      start_local: "2026-10-25T02:45",
      end_local: "2026-10-25T02:15",
      start_occurrence: "earlier",
      end_occurrence: "later",
    } as const;
    const result = calendarInstants(fold);
    expect(Date.parse(result.ends_at) - Date.parse(result.starts_at)).toBe(
      30 * 60000,
    );
    expect(calendarLocal(result.starts_at, input.time_zone)).toEqual({
      local: fold.start_local,
      occurrence: "earlier",
    });
    expect(calendarLocal(result.ends_at, input.time_zone)).toEqual({
      local: fold.end_local,
      occurrence: "later",
    });
    expect(() =>
      calendarInstants({ ...input, end_local: input.start_local }),
    ).toThrow("nach dem Beginn");
    expect(() =>
      calendarInstants({
        ...fold,
        start_occurrence: "later",
        end_occurrence: "earlier",
      }),
    ).toThrow("nach dem Beginn");
  });
  it("uses 23 and 25 hour days and resolves midnight transitions", () => {
    for (const [day, zone, hours] of [
      ["2026-03-29", "Europe/Berlin", 23],
      ["2026-10-25", "Europe/Berlin", 25],
      ["2018-11-04", "America/Sao_Paulo", 23],
      ["2020-11-01", "America/Havana", 25],
      ["2011-12-30", "Pacific/Apia", 0],
    ] as const) {
      const range = calendarDays({ day, view: "day", page: 0 }, zone)[0]!;
      expect((Date.parse(range.end) - Date.parse(range.start)) / 3600000).toBe(
        hours,
      );
    }
  });
  it("includes spanning events on each day and excludes end-at-midnight and skipped days", () => {
    const days = calendarDays(
      { day: "2026-09-29", view: "week", page: 0 },
      "Europe/Berlin",
    );
    const event = {
      starts_at: "2026-09-28T21:30:00Z",
      ends_at: "2026-09-29T22:00:00Z",
    };
    expect(
      days.filter((day) => calendarOverlaps(event, day)).map((day) => day.day),
    ).toEqual(["2026-09-28", "2026-09-29"]);
    expect(
      calendarOverlaps(event, {
        start: event.ends_at,
        end: "2026-09-30T22:00:00Z",
      }),
    ).toBe(false);
    expect(
      calendarOverlaps(event, { start: event.starts_at, end: event.starts_at }),
    ).toBe(false);
  });
  it("keeps Monday weeks across years and display dates follow the viewing zone", () => {
    const days = calendarDays(
      { day: "2026-01-01", view: "week", page: 0 },
      "UTC",
    );
    expect(days[0]?.day).toBe("2025-12-29");
    expect(days.at(-1)?.day).toBe("2026-01-04");
    expect(
      calendarDayInZone("2026-09-29T00:30:00Z", "America/Los_Angeles"),
    ).toBe("2026-09-28");
    expect(calendarDayInZone("1999-12-31T10:00:00Z", "Pacific/Pago_Pago")).toBe(
      "1999-12-30",
    );
  });
  it("supports fractional offsets and non-hour DST folds", () => {
    expect(
      calendarInstants({ ...input, time_zone: "Asia/Katmandu" }).starts_at,
    ).toBe("2026-09-29T04:15:00Z");
    const fold = {
      ...input,
      time_zone: "Australia/Lord_Howe",
      start_local: "2026-04-05T01:45",
      end_local: "2026-04-05T03:00",
    };
    const early = calendarInstants({ ...fold, start_occurrence: "earlier" }),
      late = calendarInstants({ ...fold, start_occurrence: "later" });
    expect(Date.parse(late.starts_at) - Date.parse(early.starts_at)).toBe(
      30 * 60000,
    );
  });
});
