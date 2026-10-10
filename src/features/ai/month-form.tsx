"use client";
import { askAiMonth } from "@/server/ai-actions";
import {
  aiMonthSources,
  type AiAnswerState,
  type AiMonthFacts,
} from "@/domain/ai-month";
import { MonthFacts } from "@/features/ai/month-facts";
import { ExplanationForm } from "@/features/ai/explanation-form";
export function MonthForm({
  facts,
  fingerprint,
  configured,
  reloadHref,
}: {
  facts: AiMonthFacts;
  fingerprint: string;
  configured: boolean;
  reloadHref?: string;
}) {
  return (
    <ExplanationForm<AiAnswerState>
      subject="month"
      configured={configured}
      fingerprint={fingerprint}
      hiddenFields={{ month: facts.month }}
      sources={aiMonthSources(facts.month)}
      reloadHref={reloadHref ?? `/account/ai?month=${facts.month}`}
      initialState={{ status: "idle" }}
      submit={askAiMonth}
    >
      <MonthFacts facts={facts} />
    </ExplanationForm>
  );
}
