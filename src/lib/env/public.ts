import { z } from "zod";

function isPublicKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value)) return true;

  // Compatibility with local/legacy anon keys. This is a configuration guard,
  // not signature verification or authentication. Never allow service_role.
  const parts = value.split(".");
  if (
    parts.length !== 3 ||
    !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  )
    return false;
  try {
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    ) as unknown;
    return (
      typeof payload === "object" &&
      payload !== null &&
      "role" in payload &&
      payload.role === "anon"
    );
  } catch {
    return false;
  }
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (
      (url.protocol === "https:" || (url.protocol === "http:" && local)) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().refine(isPublicKey),
});

export function parseSupabasePublicEnv(input: Record<string, unknown>) {
  const result = publicEnvSchema.safeParse(input);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ].join(", ");
    // Values and the original Zod error are deliberately excluded from messages.
    throw new Error(
      `Invalid Supabase configuration: ${names}. Check .env.local and docs/DEVELOPMENT.md.`,
    );
  }
  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabasePublicEnv() {
  // Direct property references let Next.js inline only these two public values.
  // Validate lazily: the public preview does not require Supabase credentials.
  return parseSupabasePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
