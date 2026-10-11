import { randomUUID } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { dateInZone } from "../../src/domain/transactions";
import { notificationSnapshotSchema } from "../../src/domain/notifications";
import type { createPlanFixture } from "./plan-fixtures";
export type NotificationAccount = Awaited<ReturnType<typeof createPlanFixture>>;
export function notificationPeriod(zone = "Europe/Berlin", now = new Date()) {
  const day = dateInZone(now, zone);
  return {
    day,
    yesterday: Temporal.PlainDate.from(day).subtract({ days: 1 }).toString(),
    month: day.slice(0, 7),
  };
}
export async function notificationGoal(
  user: NotificationAccount,
  due = "2026-01-01",
  name = "Hinweisziel",
) {
  const id = randomUUID();
  const result = await user.client.rpc("mutate_personal_goal", {
    p_id: id,
    p_operation: "create",
    p_revision: 0,
    p_name: name,
    p_deadline: due,
  });
  if (result.error) throw new Error("Could not prepare notification goal.");
  return id;
}
export const synchronize = (user: NotificationAccount) =>
  user.client.rpc("synchronize_notifications");
export async function readNotifications(
  user: NotificationAccount,
  filter = "all",
  page = 0,
) {
  const result = await user.client.rpc("read_notifications", {
    p_filter: filter,
    p_page: page,
  });
  if (result.error) throw new Error("Could not read notification fixture.");
  return notificationSnapshotSchema.parse(result.data);
}
export const markNotification = (
  user: NotificationAccount,
  id: string,
  read: boolean,
  revision = 0,
) =>
  user.client.rpc("set_notification_read", {
    p_id: id,
    p_read: read,
    p_revision: revision,
  });
