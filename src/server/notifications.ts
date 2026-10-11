import "server-only";
import {
  notificationQuerySchema,
  notificationSnapshotSchema,
  type NotificationQuery,
} from "@/domain/notifications";
import type { requireMoneyAccount } from "@/server/money";

export async function loadNotifications(
  account: Awaited<ReturnType<typeof requireMoneyAccount>>,
  query: NotificationQuery,
) {
  const valid = notificationQuerySchema.parse(query);
  const { data, error } = await account.supabase.rpc("read_notifications", {
    p_filter: valid.filter,
    p_page: valid.page,
  });
  if (error) throw new Error("Notifications unavailable.");
  return notificationSnapshotSchema.parse(data);
}
