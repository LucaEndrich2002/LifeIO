import { z } from "zod";

export const MAX_AMOUNT_MINOR = 99_999_999_999;

// Parse decimal text by place value; never round or multiply a decimal float.
export function parseEuro(value: string): number | null {
  const match = /^(0|[1-9]\d{0,8})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const minor =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return minor <= MAX_AMOUNT_MINOR ? minor : null;
}

export const euroAmount = (allowZero = false) =>
  z
    .string()
    .trim()
    .transform((value, context) => {
      const minor = parseEuro(value);
      if (minor === null || (!allowZero && minor === 0)) {
        context.addIssue({
          code: "custom",
          message: `Bitte gib ${allowZero ? "0 oder " : ""}einen positiven Betrag bis 999.999.999,99 € mit höchstens zwei Nachkommastellen ein. Ohne Tausendertrennzeichen.`,
        });
        return z.NEVER;
      }
      return minor;
    });

export function amountInput(minor: number): string {
  if (!Number.isSafeInteger(minor) || Math.abs(minor) > Number.MAX_SAFE_INTEGER)
    throw new Error("Invalid minor-unit amount.");
  return `${minor < 0 ? "-" : ""}${Math.floor(Math.abs(minor) / 100)},${String(Math.abs(minor) % 100).padStart(2, "0")}`;
}

export function formatEuro(minor: number): string {
  const text = amountInput(Math.abs(minor));
  const whole = BigInt(text.slice(0, -3));
  return `${minor < 0 ? "−" : ""}${new Intl.NumberFormat("de-DE").format(whole)},${text.slice(-2)} €`;
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => {
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(total + value))
      throw new Error("Unsafe monetary sum.");
    return total + value;
  }, 0);
}

export const monthSchema = z
  .string()
  .regex(
    /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/,
    "Bitte wähle einen Monat zwischen 2000 und 2100.",
  );

export function monthInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}

export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month.slice(0, 7)}-01T12:00:00Z`));
}
