import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env/public";
import { createContentSecurityPolicy } from "@/server/content-security-policy";

export async function proxy(request: NextRequest) {
  const { nonce, policy } = createContentSecurityPolicy();
  const privateRoute = /^\/(auth|account)(\/|$)/.test(request.nextUrl.pathname);
  function nextResponse() {
    // Read current headers again after Supabase refreshes the request cookies.
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    const next = NextResponse.next({ request: { headers } });
    next.headers.set("Content-Security-Policy", policy);
    // Never reuse HTML with a nonce or personalized data across requests.
    next.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (privateRoute) next.headers.set("Referrer-Policy", "no-referrer");
    return next;
  }
  let response = nextResponse();
  // Public pages get the same browser protection without contacting Auth.
  if (!privateRoute) return response;
  const { url, publishableKey } = getSupabasePublicEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items, headers) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        const previousCookies = response.cookies.getAll();
        response = nextResponse();
        for (const cookie of previousCookies) response.cookies.set(cookie);
        for (const { name, value, options } of items)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers))
          response.headers.set(name, value);
        response.headers.set("Content-Security-Policy", policy);
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Referrer-Policy", "no-referrer");
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Include RSC/prefetch requests and 404s; only framework assets bypass CSP.
  matcher: ["/((?!_next/static/|_next/image(?:/|$)).*)"],
};
