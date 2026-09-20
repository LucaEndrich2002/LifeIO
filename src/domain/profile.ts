import { z } from "zod";

export const supportedTimeZones = [
  "UTC",
  ...Intl.supportedValuesOf("timeZone"),
];

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Anzeigenamen ein.")
    .max(80, "Verwende höchstens 80 Zeichen."),
  time_zone: z
    .string()
    .refine(
      (value) => supportedTimeZones.includes(value),
      "Bitte wähle eine gültige Zeitzone.",
    ),
  currency: z.literal("EUR", { error: "LifeOS unterstützt derzeit Euro." }),
});
