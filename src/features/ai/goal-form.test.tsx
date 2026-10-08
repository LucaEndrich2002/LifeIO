import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiGoalAnswerState } from "@/domain/ai-goal";
import { goalFacts, goalAnswer, goalId } from "../../../tests/ai-goal-fixture";
const ask = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<AiGoalAnswerState>>(),
);
vi.mock("@/server/ai-actions", () => ({ askAiGoal: ask }));
import { GoalExplanationForm } from "./goal-form";
const show = (configured = true) =>
  render(
    <GoalExplanationForm
      id={goalId}
      facts={goalFacts}
      fingerprint={"b".repeat(64)}
      configured={configured}
    />,
  );
describe("goal explanation form", () => {
  it("shows original data without a provider and requires renewed consent after edits", () => {
    const view = show(false);
    expect(
      screen.getByRole("region", { name: "Verwendete Prognosedaten" }),
    ).toHaveTextContent("31. Oktober 2027");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(ask).not.toHaveBeenCalled();
    view.unmount();
    show();
    const send = screen.getByRole("button", { name: "Mit OpenAI erklären" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(send).toBeEnabled();
    fireEvent.change(
      screen.getByLabelText("Deine Frage zum Sparziel (optional)"),
      { target: { value: "Ist der Termin sicher?" } },
    );
    expect(send).toBeDisabled();
  });
  it("sends the selected goal only and shows pending, plain answer text and a fixed source", async () => {
    let finish!: (state: AiGoalAnswerState) => void;
    ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    show();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mit OpenAI erklären" }),
    );
    await waitFor(() => expect(ask).toHaveBeenCalledOnce());
    expect(Object.fromEntries(ask.mock.calls[0]![1] as FormData)).toMatchObject(
      { goal_id: goalId, consent: "yes", fingerprint: "b".repeat(64) },
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Prognosedaten werden geprüft",
    );
    finish({
      status: "success",
      facts: goalFacts,
      answer: { ...goalAnswer, paragraphs: ["<script>unerlaubt</script>"] },
      observedAt: "2026-09-30T12:00:00Z",
    });
    expect(
      await screen.findByRole("region", { name: "KI-Erklärung" }),
    ).toHaveTextContent("<script>");
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Quelle: Sparziel und Prognose" }),
    ).toHaveAttribute("href", `/account/goals/${goalId}`);
  });
  it("preserves the question on error and reloads exactly this goal", async () => {
    ask.mockResolvedValueOnce({
      status: "error",
      message: "Deine Daten haben sich geändert.",
    });
    show();
    fireEvent.change(
      screen.getByLabelText("Deine Frage zum Sparziel (optional)"),
      { target: { value: "Warum später?" } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mit OpenAI erklären" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("geändert");
    expect(
      screen.getByLabelText("Deine Frage zum Sparziel (optional)"),
    ).toHaveValue("Warum später?");
    expect(
      screen.getByRole("link", { name: "Prognosedaten neu laden" }),
    ).toHaveAttribute("href", `/account/ai/goals/${goalId}`);
  });
});
