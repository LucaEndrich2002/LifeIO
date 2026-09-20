import "server-only";
import { redirect } from "next/navigation";
import {
  createSupabaseReadClient,
  createSupabaseServerClient,
} from "@/server/supabase";

export async function requireIdentity(writable = false) {
  const supabase = await (writable
    ? createSupabaseServerClient()
    : createSupabaseReadClient());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/auth/login");
  return { supabase, user: data.user };
}
