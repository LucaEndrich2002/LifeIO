import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiGoalsAnswerState } from "@/domain/ai-goals";
import {
  goalsFacts,
  goalsNames,
  goalsAnswer,
} from "../../../tests/ai-goals-fixture";
const ask = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<AiGoalsAnswerState>>(),
);
vi.mock("@/server/ai-actions", () => ({ askAiGoals: ask }));
import { GoalsExplanationForm } from "./goals-form";
const show = (configured = true, facts = goalsFacts) =>
  render(
    <GoalsExplanationForm
      facts={facts}
      names={goalsNames}
      fingerprint={"c".repeat(64)}
      configured={configured}
    />,
  );
describe("goal overview consent and facts", () => {
  it("shows original money, unknown personal timing and local names without provider use", () => {
    show(false);
    const facts = screen.getByRole("region", { name: "Verwendete Zieldaten" });
    expect(facts).toHaveTextContent("Ziel A: Reise");
    expect(facts).toHaveTextContent("750,00 €");
    expect(facts).toHaveTextContent("Nach diesem Sparplan nach dem Zieldatum");
    expect(facts).toHaveTextContent(
      "Einhaltung des Zieldatums noch nicht einschätzbar",
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Ziel B prüfen" })).toHaveAttribute(
      "href",
      `/account/goals/${goalsNames[1]!.id}`,
    );
    expect(ask).not.toHaveBeenCalled();
  });
  it("sends only the selected page envelope, requires renewed consent and renders plain answer text", async () => {
    let finish!: (state: AiGoalsAnswerState) => void;
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
      screen.getByLabelText("Deine Frage zu diesen Zielen (optional)"),
      { target: { value: "Was zuerst?" } },
    );
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(ask).toHaveBeenCalledOnce());
    expect(Object.fromEntries(ask.mock.calls[0]![1] as FormData)).toEqual({
      page: "0",
      fingerprint: "c".repeat(64),
      question: "Was zuerst?",
      consent: "yes",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Zieldaten werden geprüft",
    );
    finish({
      status: "success",
      facts: goalsFacts,
      answer: { ...goalsAnswer, paragraphs: ["<script>bleibt Text</script>"] },
      observedAt: "2026-10-09T12:00:00Z",
    });
    expect(
      await screen.findByRole("region", { name: "KI-Erklärung" }),
    ).toHaveTextContent("<script>");
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Quelle: Ziele und Fortschritt" }),
    ).toHaveAttribute("href", "/account/home?goal_page=0#home-goals");
  });
  it("explains incomplete coverage and preserves the question on a failed later page", async () => {
    const facts = {
      ...goalsFacts,
      page: 1,
      total: 7,
      goals: [goalsFacts.goals[0]!],
    };
    ask.mockResolvedValueOnce({
      status: "error",
      message: "Deine Daten haben sich geändert.",
    });
    show(true, facts);
    expect(screen.getByText(/Ausschnitt: Die Erklärung/)).toBeVisible();
    const question = screen.getByLabelText(
      "Deine Frage zu diesen Zielen (optional)",
    );
    fireEvent.change(question, { target: { value: "Warum später?" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mit OpenAI erklären" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("geändert");
    expect(question).toHaveValue("Warum später?");
    expect(
      screen.getByRole("link", { name: "Zielseite neu laden" }),
    ).toHaveAttribute("href", "/account/ai/goals?page=1");
  });
});
