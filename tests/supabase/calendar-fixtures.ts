import { randomUUID } from "node:crypto";
import type { createPlanFixture } from "./plan-fixtures";
import type { Database } from "../../src/types/database";
import { calendarSnapshotSchema } from "../../src/domain/calendar";
export type CalendarAccount = Awaited<ReturnType<typeof createPlanFixture>>;
type Mutation =
  Database["public"]["Functions"]["mutate_calendar_event"]["Args"];
export const eventTimes = {
  p_starts_at: "2026-09-28T21:30:00Z",
  p_ends_at: "2026-09-29T22:00:00Z",
  p_time_zone: "Europe/Berlin",
};
export const mutateEvent = (
  user: CalendarAccount,
  args: Partial<Mutation> & Pick<Mutation, "p_id" | "p_operation">,
) =>
  user.client.rpc("mutate_calendar_event", {
    p_revision: 0,
    ...eventTimes,
    ...args,
  });
export async function createEvent(
  user: CalendarAccount,
  title = "Reise",
  args: Partial<Mutation> = {},
) {
  const id = randomUUID();
  const { error } = await mutateEvent(user, {
    p_id: id,
    p_operation: "create",
    p_title: title,
    ...args,
  });
  if (error)
    throw new Error(`Could not prepare calendar fixture: ${error.code}`);
  return id;
}
export async function readEvents(
  user: CalendarAccount,
  args: Partial<
    Database["public"]["Functions"]["read_calendar_events"]["Args"]
  > = {},
) {
  const { data, error } = await user.client.rpc("read_calendar_events", {
    p_start: "2026-09-27T22:00:00Z",
    p_end: "2026-10-04T22:00:00Z",
    ...args,
  });
  if (error) throw new Error(`Could not read calendar fixture: ${error.code}`);
  return calendarSnapshotSchema.parse(data);
}
