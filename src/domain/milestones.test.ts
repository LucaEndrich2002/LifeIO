import { describe, expect, it } from "vitest";
import {
  milestoneMutationSchema,
  milestoneProgress,
  milestoneSnapshotSchema,
  milestoneTitleSchema,
} from "./milestones";

describe("goal milestones", () => {
  it("requires a named milestone without adding financial values", () => {
    expect(milestoneTitleSchema.parse("  Angebote vergleichen  ")).toBe(
      "Angebote vergleichen",
    );
    expect(milestoneTitleSchema.safeParse("  ").success).toBe(false);
    expect(milestoneTitleSchema.safeParse("a".repeat(81)).success).toBe(false);
    expect(milestoneTitleSchema.safeParse("🌱".repeat(80)).success).toBe(true);
    expect(milestoneTitleSchema.safeParse("🌱".repeat(81)).success).toBe(false);
  });
  it("does not invent progress for an empty list and rounds equal-weight milestones", () => {
    expect(milestoneProgress(0, 0)).toBeNull();
    expect(milestoneProgress(3, 0)).toBe(0);
    expect(milestoneProgress(3, 1)).toBe(33);
    expect(milestoneProgress(3, 2)).toBe(67);
    expect(milestoneProgress(3, 3)).toBe(100);
    expect(
      milestoneProgress(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1),
    ).toBe(100);
  });
  it("rejects inconsistent or unsafe progress counts", () => {
    for (const [total, completed] of [
      [-1, 0],
      [0, 1],
      [1, -1],
      [2, 0.5],
      [Number.MAX_SAFE_INTEGER + 1, 0],
    ])
      expect(() => milestoneProgress(total!, completed!)).toThrow();
  });
  it("validates identity, revision and the return page instead of accepting a redirect URL", () => {
    const input = {
      id: "164d5c74-5f39-4c1b-aa16-d9c8a2a16e01",
      goal_id: "a5a33794-3c9c-4c42-bd2d-659beef9498a",
      revision: "2",
      operation: "complete",
      return_page: "1",
    };
    expect(milestoneMutationSchema.parse(input)).toMatchObject({
      revision: 2,
      return_page: 1,
    });
    for (const invalid of [
      { id: "new" },
      { revision: -1 },
      { operation: "toggle" },
      { return_page: "https://example.com" },
      { return_page: 1000001 },
    ])
      expect(
        milestoneMutationSchema.safeParse({ ...input, ...invalid }).success,
      ).toBe(false);
  });
  it("validates complete counts even when the current page is empty", () => {
    expect(
      milestoneSnapshotSchema.parse({ items: [], total: 28, completed: 14 })
        .completed,
    ).toBe(14);
    expect(
      milestoneSnapshotSchema.safeParse({ items: [], total: 1, completed: 2 })
        .success,
    ).toBe(false);
    expect(
      milestoneSnapshotSchema.safeParse({ items: [], total: -1, completed: 0 })
        .success,
    ).toBe(false);
  });
});
