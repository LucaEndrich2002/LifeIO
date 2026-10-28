const invalidConfiguration =
  "Invalid local Supabase test configuration. Values and CLI output withheld.";

function loopbackOrigin(value) {
  if (typeof value !== "string") throw new Error();
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error();
  return url.origin;
}

function credential(value) {
  if (typeof value !== "string" || !value.length || /[\s\0]/u.test(value))
    throw new Error();
  return value;
}

// Only the four values required by local fixtures leave this boundary.
// Never retain the parse/URL error as a cause: it can contain raw credentials.
export function parseLocalTestConfiguration(output) {
  try {
    if (typeof output !== "string") throw new Error();
    const status = JSON.parse(output);
    if (!status || typeof status !== "object" || Array.isArray(status))
      throw new Error();
    return {
      url: loopbackOrigin(status.API_URL),
      key: credential(status.PUBLISHABLE_KEY ?? status.ANON_KEY),
      serviceKey: credential(status.SECRET_KEY ?? status.SERVICE_ROLE_KEY),
      mailUrl: loopbackOrigin(status.MAILPIT_URL ?? status.INBUCKET_URL),
    };
  } catch {
    throw new Error(invalidConfiguration);
  }
}
