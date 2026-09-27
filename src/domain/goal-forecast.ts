import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/domain/money";
import { dateSchema } from "@/domain/transactions";

const amount = z.number().int().min(0).max(MAX_AMOUNT_MINOR);
const inputSchema = z.object({
  targetMinor: amount.positive(),
  balanceMinor: amount,
  today: dateSchema,
  deadline: dateSchema.nullable(),
  rates: z.array(
    z.object({
      month: z.string().regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])-01$/),
      amount_minor: amount,
    }),
  ),
});

type Projection =
  | { status: "reached"; contributions: 0 }
  | {
      status: "projected";
      date: string;
      nextContributionDate: string;
      contributions: number;
    }
  | { status: "unplanned" | "beyond_range" };
export type GoalForecast = Projection & {
  remainingMinor: number;
  deadlineStatus: "on_time" | "late" | "overdue" | "unavailable" | null;
};

function monthIndex(date: string) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

function monthEnd(index: number) {
  // UTC is only calendar arithmetic; `today` already uses the profile's zone.
  return new Date(Date.UTC(Math.floor(index / 12), (index % 12) + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export function forecastGoal(input: z.input<typeof inputSchema>): GoalForecast {
  const { targetMinor, balanceMinor, today, deadline, rates } =
    inputSchema.parse(input);
  const schedule = [...rates].sort((a, b) => a.month.localeCompare(b.month));
  if (new Set(schedule.map((rate) => rate.month)).size !== schedule.length)
    throw new Error("Ambiguous savings rate history.");
  const remainingMinor = Math.max(0, targetMinor - balanceMinor);

  function project(): Projection {
    if (!remainingMinor) return { status: "reached", contributions: 0 };
    let remaining = BigInt(remainingMinor);
    let rate = 0n;
    let cursor = 0;
    let contributions = 0;
    let nextContributionDate = "";
    // Never assume the current month's contribution or catch up missed ones.
    for (let month = monthIndex(today) + 1; month <= 2100 * 12 + 11; month++) {
      while (cursor < schedule.length) {
        const entry = schedule[cursor]!;
        if (monthIndex(entry.month) > month) break;
        rate = BigInt(entry.amount_minor);
        cursor++;
      }
      if (rate === 0n) continue;
      contributions++;
      nextContributionDate ||= monthEnd(month);
      remaining -= rate;
      if (remaining <= 0n)
        return {
          status: "projected",
          date: monthEnd(month),
          nextContributionDate,
          contributions,
        };
    }
    return {
      status: schedule.at(-1)?.amount_minor ? "beyond_range" : "unplanned",
    };
  }

  const projection = project();
  return {
    ...projection,
    remainingMinor,
    deadlineStatus:
      !deadline || projection.status === "reached"
        ? null
        : deadline < today
          ? "overdue"
          : projection.status !== "projected"
            ? "unavailable"
            : projection.date > deadline
              ? "late"
              : "on_time",
  };
}
