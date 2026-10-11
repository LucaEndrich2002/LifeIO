import { describe, expect, it } from "vitest";
import {
  notificationContent,
  notificationHref,
  notificationMutationSchema,
  notificationQuerySchema,
  notificationSchema,
} from "./notifications";
const id = "00000000-0000-4000-8000-000000000001";
const base = {
  id,
  created_at: "2026-10-12T10:00:00Z",
  read_at: null,
  revision: 0,
  rule_version: 1,
  checked_on: "2026-10-12",
  time_zone: "Europe/Berlin",
};
const budget = () => ({
  ...base,
  kind: "budget",
  task_id: null,
  goal_id: null,
  review_week: null,
  budget_id: id,
  context: {
    name: "Alltag",
    month: "2026-10",
    currency: "EUR",
    spent_minor: "9001",
    limit_minor: "10001",
  },
});
describe("notification rules and safe navigation", () => {
  it("validates page/filter/read input without interpreting false text as true", () => {
    expect(notificationHref({ filter: "unread", page: 2 })).toBe(
      "/account/notifications?filter=unread&page=2",
    );
    for (const input of [
      { page: -1 },
      { page: 1000001 },
      { filter: "https://example.test" },
    ])
      expect(notificationQuerySchema.safeParse(input).success).toBe(false);
    expect(
      notificationMutationSchema.parse({ id, revision: "0", read: "no" }).read,
    ).toBe(false);
    expect(
      notificationMutationSchema.safeParse({ id, revision: 0, read: "false" })
        .success,
    ).toBe(false);
  });
  it("uses exact stored cents for the 90 percent boundary and rejects unsafe totals", () => {
    const input = budget();
    expect(
      notificationContent(notificationSchema.parse(input)).detail,
    ).toContain("90,01 €");
    input.context.spent_minor = "9000";
    expect(notificationSchema.safeParse(input).success).toBe(false);
    input.context.spent_minor = String(Number.MAX_SAFE_INTEGER);
    expect(notificationSchema.safeParse(input).success).toBe(true);
    input.context.spent_minor = "9007199254740992";
    expect(notificationSchema.safeParse(input).success).toBe(false);
    input.context.spent_minor = "not-a-number";
    expect(notificationSchema.safeParse(input).success).toBe(false);
    input.context.spent_minor = "9001";
    input.context.currency = "USD";
    expect(notificationSchema.safeParse(input).success).toBe(false);
  });
  it("links only typed application sources even with hostile stored text", () => {
    const input = {
      ...base,
      kind: "task",
      task_id: id,
      goal_id: null,
      budget_id: null,
      review_week: null,
      context: {
        name: "<script>https://example.test</script>",
        due_on: "2026-10-11",
      },
    };
    const content = notificationContent(notificationSchema.parse(input));
    expect(content.href).toBe(`/account/plan/${id}`);
    expect(content.detail).toContain("bei der Prüfung noch offen");
    input.context.due_on = "2026-10-12";
    expect(notificationSchema.safeParse(input).success).toBe(false);
  });
  it("keeps review week navigation consistent across a year boundary", () => {
    const input = {
      ...base,
      kind: "review",
      task_id: null,
      goal_id: null,
      budget_id: null,
      review_week: "2025-12-29",
      context: { week_start: "2025-12-29" },
    };
    const content = notificationContent(notificationSchema.parse(input));
    expect(content.detail).toContain("29.12.2025 bis 04.01.2026");
    expect(content.href).toBe("/account/review?week=2025-12-29");
    input.context.week_start = "2026-01-05";
    expect(notificationSchema.safeParse(input).success).toBe(false);
  });
});
