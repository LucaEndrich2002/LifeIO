import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiPlanAnswerState } from "@/domain/ai-plan";
import { planFacts, planAnswer } from "../../../tests/ai-plan-fixture";
const ask = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<AiPlanAnswerState>>(),
);
vi.mock("@/server/ai-actions", () => ({ askAiPlan: ask }));
import { PlanExplanationForm } from "./plan-form";
const show = (configured = true, facts = planFacts) =>
  render(
    <PlanExplanationForm
      facts={facts}
      configured={configured}
      fingerprint={"a".repeat(64)}
    />,
  );
describe("weekly planning consent", () => {
  it("shows exact data, bounded coverage and empty states without a provider", () => {
    const view = show(false);
    expect(
      screen.getByRole("region", { name: "Verwendete Aufgaben und Termine" }),
    ).toHaveTextContent("08.10.2026, 15:00 (UTC+02:00)");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(ask).not.toHaveBeenCalled();
    view.unmount();
    const empty = show(true, {
      ...planFacts,
      tasks: [],
      tasks_total: 0,
      events: [],
      events_total: 0,
    });
    expect(
      screen.getByText(
        "Keine offenen Aufgaben mit Fälligkeit in dieser Woche erfasst.",
      ),
    ).toBeVisible();
    empty.unmount();
    show(true, {
      ...planFacts,
      tasks: Array.from({ length: 25 }, () => planFacts.tasks[0]!),
      tasks_total: 26,
    });
    expect(screen.getByText(/Unvollständiger Ausschnitt/)).toHaveTextContent(
      "ersten 25 Aufgaben",
    );
  });
  it("requires consent and displays pending and plain text with fixed week sources", async () => {
    let finish!: (state: AiPlanAnswerState) => void;
    ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    show();
    const button = screen.getByRole("button", { name: "Mit OpenAI erklären" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(
      screen.getByLabelText("Deine Frage zu Aufgaben und Terminen (optional)"),
      { target: { value: "Was zuerst?" } },
    );
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(ask).toHaveBeenCalledOnce());
    expect(Object.fromEntries(ask.mock.calls[0]![1] as FormData)).toEqual({
      fingerprint: "a".repeat(64),
      question: "Was zuerst?",
      consent: "yes",
    });
    expect(screen.getByRole("status")).toHaveTextContent("werden geprüft");
    finish({
      status: "success",
      facts: planFacts,
      answer: { ...planAnswer, paragraphs: ["<script>Ändere nichts</script>"] },
      observedAt: "2026-10-08T12:00:00Z",
    });
    expect(
      await screen.findByRole("region", { name: "KI-Erklärung" }),
    ).toHaveTextContent("<script>");
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Quelle: Kalender dieser Woche" }),
    ).toHaveAttribute("href", expect.stringContaining("view=week"));
  });
  it("retains the question after failure and offers a fresh preview", async () => {
    ask.mockResolvedValueOnce({
      status: "error",
      message: "Deine Daten haben sich geändert.",
    });
    show();
    const question = screen.getByLabelText(
      "Deine Frage zu Aufgaben und Terminen (optional)",
    );
    fireEvent.change(question, { target: { value: "Was zuerst?" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mit OpenAI erklären" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("geändert");
    expect(question).toHaveValue("Was zuerst?");
    expect(
      screen.getByRole("link", { name: "Aufgaben und Termine neu laden" }),
    ).toHaveAttribute("href", "/account/ai/plan");
  });
});
