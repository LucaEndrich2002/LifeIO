// Minimal, disposable Auth/Data API gateway. This is not the production or
// complete Supabase gateway configuration (Storage/Realtime/Admin are absent).
export function recoveryGatewayConfig(anonKey) {
  return JSON.stringify({
    _format_version: "2.1",
    _transform: true,
    consumers: [{ username: "anon", keyauth_credentials: [{ key: anonKey }] }],
    services: [
      ["auth", 9999, "/auth/v1/"],
      ["rest", 3001, "/rest/v1/"],
    ].map(([name, port, path]) => ({
      name,
      url: `http://127.0.0.1:${port}/`,
      routes: [{ name, strip_path: true, paths: [path] }],
      plugins: [
        { name: "cors" },
        {
          name: "key-auth",
          config: { hide_credentials: false, key_names: ["apikey"] },
        },
      ],
    })),
  });
}
