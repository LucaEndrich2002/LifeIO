import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { testSupabaseUrl } from "./fixtures";
import { z } from "zod";
import {
  isLocalDockerEndpoint,
  readDockerEndpoint,
  runDocker,
} from "../../scripts/local-docker.mjs";
// Only controlled local fixture counters may be adjusted for time-boundary tests.
const admin = createClient<Database>(
  testSupabaseUrl,
  process.env.LIFEOS_TEST_SERVICE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export async function seedAiCounter(
  userId: string,
  day: string,
  attempts: number,
  lastRequestedAt: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (
    error ||
    !/^lifeos-test-[0-9a-f-]+@example\.test$/.test(data.user?.email ?? "")
  )
    throw new Error("Only fixture counters may be seeded.");
  if (!isLocalDockerEndpoint(readDockerEndpoint()))
    throw new Error("Only local Docker fixtures are allowed.");
  // Keep ordinary and service-role Data API writes denied. The fixture-only
  // database connection seeds time boundaries using strictly parsed literals.
  z.uuid().parse(userId);
  z.iso.date().parse(day);
  z.number().int().min(1).max(20).parse(attempts);
  z.iso.datetime().parse(lastRequestedAt);
  const result = runDocker([
    "exec",
    "supabase_db_lifeos",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into public.ai_request_limits(user_id,day,attempts,last_requested_at) values ('${userId}','${day}',${attempts},'${lastRequestedAt}') on conflict(user_id) do update set day=excluded.day,attempts=excluded.attempts,last_requested_at=excluded.last_requested_at;`,
  ]);
  if (result.status !== 0) throw new Error("Fixture counter unavailable.");
}
