import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { goalsFacts } from "../../../tests/ai-goals-fixture";
import { monthFacts } from "../../../tests/ai-month-fixture";
const mocks = vi.hoisted(() => ({ load: vi.fn(), ask: vi.fn() }));
vi.mock("@/server/ai/home-data", () => ({ loadHomeInsight: mocks.load }));
vi.mock("@/server/ai/provider", () => ({
  aiConfig: () => ({ key: "test", model: "test" }),
}));
vi.mock("@/server/ai-actions", () => ({
  askAiMonth: mocks.ask,
  askAiPlan: mocks.ask,
  askAiGoals: mocks.ask,
}));
import { HomeAiPreview } from "./ai-insight";
const props = {
  client: {} as SupabaseClient<Database>,
  query: { month: "2026-09", goal_page: 1, insight: "month" as const },
  now: new Date("2026-10-10T12:00:00Z"),
};
describe("Home AI preview states", () => {
  it("keeps the retry within the chosen Home context and exposes no provider form when unavailable", async () => {
    mocks.load.mockResolvedValueOnce({ status: "unavailable" });
    render(await HomeAiPreview(props));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Überblick und die Originaldaten",
    );
    expect(
      screen.getByRole("link", { name: "Datenvorschau erneut laden" }),
    ).toHaveAttribute(
      "href",
      "/account/home?month=2026-09&goal_page=1&insight=month#home-ai",
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it("offers a first-page recovery for empty goal pages without consuming a provider request", async () => {
    mocks.load.mockResolvedValueOnce({
      status: "ready",
      kind: "goals",
      snapshot: { facts: { ...goalsFacts, page: 1, total: 2, goals: [] } },
    });
    render(
      await HomeAiPreview({
        ...props,
        query: { ...props.query, insight: "goals" },
      }),
    );
    expect(
      screen.getByRole("link", { name: "Erste Zielseite für die KI öffnen" }),
    ).toHaveAttribute(
      "href",
      "/account/home?month=2026-09&goal_page=0&insight=goals#home-ai",
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(mocks.ask).not.toHaveBeenCalled();
  });
  it("uses explicit consent and renders the answer on Home while preserving its retry target", async () => {
    mocks.load.mockResolvedValueOnce({
      status: "ready",
      kind: "month",
      snapshot: { facts: monthFacts, fingerprint: "a".repeat(64) },
    });
    mocks.ask.mockResolvedValueOnce({
      status: "error",
      message: "Deine Daten haben sich geändert.",
    });
    render(await HomeAiPreview(props));
    const send = screen.getByRole("button", { name: "Mit OpenAI erklären" });
    expect(send).toBeDisabled();
    expect(mocks.ask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(send);
    expect(await screen.findByRole("alert")).toHaveTextContent("geändert");
    expect(
      screen.getByRole("link", { name: "Monatsdaten neu laden" }),
    ).toHaveAttribute(
      "href",
      "/account/home?month=2026-09&goal_page=1&insight=month#home-ai",
    );
    mocks.ask.mockResolvedValueOnce({
      status: "success",
      facts: monthFacts,
      observedAt: "2026-10-10T12:00:00Z",
      answer: {
        paragraphs: ["Prüfe die erfassten Ausgaben."],
        sources: ["financial"],
      },
    });
    fireEvent.click(send);
    expect(
      await screen.findByRole("region", { name: "KI-Erklärung" }),
    ).toHaveTextContent("Prüfe die erfassten Ausgaben.");
    expect(
      screen.getByRole("link", { name: "Quelle: Monatsübersicht" }),
    ).toHaveAttribute("href", "/account/money?month=2026-09");
  });
});
