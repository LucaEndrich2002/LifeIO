import type { Request } from "@playwright/test";

/** Preserve the real encoding in memory without retaining Cookie headers. */
export function capturedAction(request: Request) {
  const data = request.postDataBuffer();
  const actionId = request.headers()["next-action"];
  const contentType = request.headers()["content-type"];
  if (request.method() !== "POST" || !data || !actionId || !contentType)
    throw new Error("Expected a Server Action POST with routing and encoding.");
  return {
    url: request.url(),
    options: {
      headers: {
        "next-action": actionId,
        "content-type": contentType,
        accept: "text/x-component",
        origin: new URL(request.url()).origin,
      },
      data,
      maxRedirects: 0,
    },
  };
}
