import { CalendarScreen } from "@/features/plan/calendar-screen";
import type { CalendarSearch } from "@/domain/calendar";
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearch>;
}) {
  return <CalendarScreen query={await searchParams} />;
}
