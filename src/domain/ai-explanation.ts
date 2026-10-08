import { z } from "zod";

// All numeric values are rendered from domain facts, never from model text.
export const explanationParagraphs = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(700)
      .refine((text) => !/\p{N}/u.test(text)),
  )
  .min(1)
  .max(3);

export type ExplanationState<Facts, Answer> =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; facts: Facts; answer: Answer; observedAt: string };
