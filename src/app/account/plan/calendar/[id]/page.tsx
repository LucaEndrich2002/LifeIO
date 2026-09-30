import { CalendarEventScreen } from "@/features/plan/calendar-event-screen";
import type { CalendarSearch } from "@/domain/calendar";
export default async function CalendarEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<CalendarSearch & { action?: string }>;
}) {
  const { id } = await params;
  const { action, ...query } = await searchParams;
  return <CalendarEventScreen id={id} action={action} query={query} />;
}
