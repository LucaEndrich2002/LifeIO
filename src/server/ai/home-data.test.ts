import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
vi.mock("server-only", () => ({}));
const loaders = vi.hoisted(() => ({
  month: vi.fn(),
  plan: vi.fn(),
  goals: vi.fn(),
}));
vi.mock("./month-data", () => ({ loadAiMonth: loaders.month }));
vi.mock("./plan-data", () => ({ loadAiPlan: loaders.plan }));
vi.mock("./goals-data", () => ({ loadAiGoals: loaders.goals }));
import { loadHomeInsight } from "./home-data";
const client = {} as SupabaseClient<Database>;
const query = { month: "2026-09", goal_page: 1 };
const now = new Date("2026-10-10T12:00:00Z");
describe("Home insight data selection", () => {
  it("does no extra reads on ordinary Home, rejects invalid input and respects the AI page bound", async () => {
    expect(await loadHomeInsight(client, query)).toEqual({ status: "idle" });
    expect(
      await loadHomeInsight(client, {
        ...query,
        goal_page: 1001,
        insight: "goals",
      }),
    ).toEqual({ status: "page_limit" });
    await expect(
      loadHomeInsight(client, { ...query, insight: "all" }),
    ).rejects.toThrow();
    for (const loader of Object.values(loaders))
      expect(loader).not.toHaveBeenCalled();
  });
  it("loads only the selected scope with the exact month, page or current instant", async () => {
    for (const insight of ["month", "plan", "goals"] as const) {
      vi.clearAllMocks();
      const snapshot = { fingerprint: `snapshot-${insight}` };
      loaders[insight].mockResolvedValueOnce(snapshot);
      expect(await loadHomeInsight(client, { ...query, insight }, now)).toEqual(
        { status: "ready", kind: insight, snapshot },
      );
      expect(loaders[insight]).toHaveBeenCalledOnce();
      for (const other of ["month", "plan", "goals"] as const)
        if (other !== insight) expect(loaders[other]).not.toHaveBeenCalled();
      expect(loaders[insight].mock.calls[0]).toEqual(
        insight === "month"
          ? [client, query.month]
          : insight === "plan"
            ? [client, now]
            : [client, query.goal_page, now],
      );
    }
  });
  it("contains data failures inside the insight instead of leaking errors or breaking Home", async () => {
    for (const insight of ["month", "plan", "goals"] as const) {
      loaders[insight].mockRejectedValueOnce(new Error("private diagnostic"));
      expect(await loadHomeInsight(client, { ...query, insight })).toEqual({
        status: "unavailable",
      });
    }
  });
});
