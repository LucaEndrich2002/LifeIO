import "server-only";
import { notFound } from "next/navigation";
import { calendarEventSchema, calendarSnapshotSchema } from "@/domain/calendar";
import type { requireMoneyAccount } from "@/server/money";
type Account = Awaited<ReturnType<typeof requireMoneyAccount>>;
export async function loadCalendar(
  account: Account,
  start: string,
  end: string,
  page: number,
) {
  const { data, error } = await account.supabase.rpc("read_calendar_events", {
    p_start: start,
    p_end: end,
    p_page: page,
  });
  if (error) throw new Error("Calendar unavailable.");
  return calendarSnapshotSchema.parse(data);
}
export async function loadCalendarEvent(
  { supabase, user }: Account,
  id: string,
) {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id,title,starts_at,ends_at,time_zone,revision")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Event unavailable.");
  if (!data) notFound();
  return calendarEventSchema.parse(data);
}
