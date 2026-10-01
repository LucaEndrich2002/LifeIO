import { describe, expect, it } from "vitest";
import {
  goalPlanMutationSchema,
  goalPlanReturn,
  goalPlanHref,
  planTargetHref,
  planLinksPageSchema,
  planLinksQuerySchema,
} from "./goal-plan-links";
const input = {
  id: "00000000-0000-4000-8000-000000000001",
  goal_id: "00000000-0000-4000-8000-000000000002",
  target_id: "00000000-0000-4000-8000-000000000003",
  kind: "task",
  operation: "remove",
  from: "goal",
  return_page: 1,
} as const;
describe("typed goal-plan links", () => {
  it("validates relationship kinds, operations, UUIDs and bounded return navigation", () => {
    expect(
      goalPlanMutationSchema.parse({ ...input, return_page: "1" }),
    ).toEqual(input);
    for (const change of [
      { kind: "budget" },
      { operation: "delete_goal" },
      { target_id: "wrong" },
      { goal_id: "wrong" },
      { from: "https://example.com" },
      { return_page: -1 },
      { return_page: 1000001 },
    ])
      expect(
        goalPlanMutationSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    expect(planLinksQuerySchema.parse({})).toEqual({
      kind: "task",
      mode: "linked",
      page: 0,
    });
    expect(planLinksQuerySchema.safeParse({ mode: "all_users" }).success).toBe(
      false,
    );
  });
  it("builds only local, validated return paths and preserves the chosen side and page", () => {
    expect(goalPlanReturn(input)).toBe(goalPlanHref(input.goal_id, "task", 1));
    expect(goalPlanReturn({ ...input, operation: "create" })).toBe(
      goalPlanHref(input.goal_id, "task", 0),
    );
    expect(goalPlanReturn({ ...input, kind: "event", from: "target" })).toBe(
      `/account/plan/calendar/${input.target_id}/goals?page=1`,
    );
    expect(planTargetHref("task", input.target_id)).toBe(
      `/account/plan/${input.target_id}`,
    );
    expect(() => planTargetHref("event", "../other")).toThrow();
    expect(() => goalPlanHref(input.goal_id, "task", -1)).toThrow();
  });
  it("validates typed endpoints and complete page counts", () => {
    const task = {
      kind: "task",
      item: {
        id: input.target_id,
        title: "Lesen",
        priority: "normal",
        due_on: null,
        completed_at: null,
        revision: 0,
      },
    };
    const event = {
      kind: "event",
      item: {
        id: input.target_id,
        title: "Reise",
        time_zone: "Europe/Berlin",
        starts_at: "2026-09-29T10:00:00Z",
        ends_at: "2026-09-29T11:00:00Z",
        revision: 0,
      },
    };
    for (const target of [task, event]) {
      expect(
        planLinksPageSchema.safeParse({
          items: [{ target, link_id: input.id }],
          count: 26,
        }).success,
      ).toBe(true);
      expect(
        planLinksPageSchema.safeParse({ items: [{ target }], count: 0 })
          .success,
      ).toBe(false);
      expect(
        planLinksPageSchema.safeParse({
          items: Array(26).fill({ target }),
          count: 26,
        }).success,
      ).toBe(false);
    }
    expect(
      planLinksPageSchema.safeParse({
        items: [{ target: { ...task, kind: "event" } }],
        count: 1,
      }).success,
    ).toBe(false);
  });
});
