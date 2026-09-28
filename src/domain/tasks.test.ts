import { describe, expect, it } from "vitest";
import { dateInZone } from "./transactions";
import {
  taskInputSchema,
  taskMutationSchema,
  taskSnapshotSchema,
  taskListHref,
  taskWeek,
  taskIsOverdue,
  taskDateLabel,
} from "./tasks";
const id = "fbb80dbf-c575-4254-b607-d68dd0d8d890";
describe("task rules", () => {
  it("accepts real optional calendar days and trims titles by Unicode character count", () => {
    expect(
      taskInputSchema.parse({
        title: "\u00a0 Besorgen \u00a0",
        priority: "normal",
        due_on: "",
      }).title,
    ).toBe("Besorgen");
    expect(
      taskInputSchema.safeParse({
        title: "🌿".repeat(80),
        priority: "high",
        due_on: "2028-02-29",
      }).success,
    ).toBe(true);
    for (const change of [
      { title: "\u00a0" },
      { title: "🌿".repeat(81) },
      { priority: "urgent" },
      { due_on: "2026-02-29" },
      { due_on: "1999-12-31" },
      { due_on: "2101-01-01" },
      { due_on: null },
    ])
      expect(
        taskInputSchema.safeParse({
          title: "Planen",
          priority: "low",
          due_on: "",
          ...change,
        }).success,
      ).toBe(false);
  });
  it("bounds mutations and navigation independently of form field validation", () => {
    const input = { id, revision: 0, operation: "complete", day: "2026-09-28" };
    expect(taskMutationSchema.parse(input)).toMatchObject({
      view: "all",
      status: "open",
      page: 0,
    });
    for (const change of [
      { id: "foreign" },
      { operation: "toggle" },
      { revision: -1 },
      { revision: 2147483647 },
      { view: "https://example.com" },
      { status: "any" },
      { page: 1000001 },
      { page: -1 },
    ])
      expect(
        taskMutationSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
  });
  it("uses Monday to Sunday across year, leap-year and DST boundaries", () => {
    for (const [day, start, end] of [
      ["2026-01-01", "2025-12-29", "2026-01-04"],
      ["2028-02-29", "2028-02-28", "2028-03-05"],
      ["2026-03-29", "2026-03-23", "2026-03-29"],
      ["2026-10-25", "2026-10-19", "2026-10-25"],
      ["2000-01-01", "1999-12-27", "2000-01-02"],
      ["2100-12-31", "2100-12-27", "2101-01-02"],
    ])
      expect(taskWeek(day!)).toEqual({ start, end });
    expect(taskDateLabel("2026-03-29")).toBe("29.03.2026");
  });
  it("derives today from the profile zone including midnight and DST", () => {
    const now = new Date("2026-03-29T22:30:00Z");
    expect(dateInZone(now, "Europe/Berlin")).toBe("2026-03-30");
    expect(dateInZone(now, "America/Los_Angeles")).toBe("2026-03-29");
    expect(taskWeek(dateInZone(now, "Europe/Berlin")).start).toBe("2026-03-30");
    expect(taskWeek(dateInZone(now, "America/Los_Angeles")).start).toBe(
      "2026-03-23",
    );
  });
  it("marks only open tasks strictly before today overdue", () => {
    expect(
      taskIsOverdue({ due_on: "2026-09-27", completed_at: null }, "2026-09-28"),
    ).toBe(true);
    for (const task of [
      { due_on: null, completed_at: null },
      { due_on: "2026-09-28", completed_at: null },
      { due_on: "2026-09-27", completed_at: "2026-09-27T10:00:00Z" },
    ])
      expect(taskIsOverdue(task, "2026-09-28")).toBe(false);
  });
  it("preserves filters in safe local URLs and checks complete list counts", () => {
    expect(
      taskListHref({
        view: "week",
        status: "completed",
        day: "2026-09-28",
        page: 2,
      }),
    ).toBe("/account/plan?view=week&status=completed&day=2026-09-28&page=2");
    const task = {
      id,
      title: "Lesen",
      priority: "normal",
      due_on: null,
      completed_at: null,
      revision: 0,
    };
    expect(taskSnapshotSchema.parse({ items: [task], total: 26 }).total).toBe(
      26,
    );
    expect(
      taskSnapshotSchema.safeParse({ items: [task], total: 0 }).success,
    ).toBe(false);
    expect(
      taskSnapshotSchema.safeParse({ items: Array(26).fill(task), total: 26 })
        .success,
    ).toBe(false);
  });
});
