import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

/** Writable adapter: only for Server Actions and Route Handlers. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        for (const { name, value, options } of items) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/** Proxy refreshes cookies before RSC rendering. This adapter never silently catches writes. */
export async function createSupabaseReadClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();
  return createServerClient<Database>(url, publishableKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  });
}
