import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiAnswerState } from "@/domain/ai-month";
import { monthFacts, monthAnswer } from "../../../tests/ai-month-fixture";
const ask = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<AiAnswerState>>(),
);
vi.mock("@/server/ai-actions", () => ({ askAiMonth: ask }));
import { MonthForm } from "./month-form";
const show = (configured = true) =>
  render(
    <MonthForm
      facts={monthFacts}
      fingerprint={"a".repeat(64)}
      configured={configured}
    />,
  );
describe("monthly AI form", () => {
  it("requires a fresh opt-in after editing and shows unavailable state without sending", () => {
    const view = show();
    const send = screen.getByRole("button", { name: "Mit OpenAI erklären" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(send).toBeEnabled();
    fireEvent.change(
      screen.getByLabelText("Deine Frage zum Monat (optional)"),
      { target: { value: "Warum?" } },
    );
    expect(send).toBeDisabled();
    expect(ask).not.toHaveBeenCalled();
    view.unmount();
    show(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "noch nicht eingerichtet",
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
  it("shows pending, plain answer text, facts and fixed source links", async () => {
    let finish!: (state: AiAnswerState) => void;
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
    await waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status")).toHaveTextContent("geprüft und erklärt");
    finish({
      status: "success",
      facts: monthFacts,
      observedAt: "2026-10-01T10:00:00Z",
      answer: {
        ...monthAnswer,
        paragraphs: ["<script>alert('test')</script>"],
      },
    });
    expect(
      await screen.findByRole("region", { name: "KI-Erklärung" }),
    ).toHaveTextContent("<script>");
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Quelle: Monatsübersicht" }),
    ).toHaveAttribute("href", "/account/money?month=2026-09");
    expect(
      screen.getByRole("region", { name: "Verwendete Monatsdaten" }),
    ).toHaveTextContent("800,00 €");
  });
  it("keeps the question after failure and provides a reload path", async () => {
    ask.mockResolvedValueOnce({
      status: "error",
      message: "Deine Monatsdaten haben sich geändert.",
    });
    show();
    fireEvent.change(
      screen.getByLabelText("Deine Frage zum Monat (optional)"),
      { target: { value: "Wie läuft es?" } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Mit OpenAI erklären" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("geändert");
    expect(
      screen.getByLabelText("Deine Frage zum Monat (optional)"),
    ).toHaveValue("Wie läuft es?");
    expect(
      screen.getByRole("link", { name: "Monatsdaten neu laden" }),
    ).toHaveAttribute("href", "/account/ai?month=2026-09");
  });
});
