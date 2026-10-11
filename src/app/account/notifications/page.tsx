import { NotificationsScreen } from "@/features/notifications/notifications-screen";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  return <NotificationsScreen search={await searchParams} />;
}
