import { spawnSync } from "node:child_process";

const network = spawnSync(process.execPath, ["scripts/db-network.mjs"], {
  stdio: "inherit",
  windowsHide: true,
});
if (network.status !== 0) process.exit(network.status ?? 1);
console.log("Starting local Supabase for integration and browser tests.");
// Supabase prints credentials on success; keep its output in memory only.
const start = spawnSync(
  process.execPath,
  [
    "node_modules/supabase/dist/supabase.js",
    "start",
    "--network-id",
    "lifeos-local",
  ],
  {
    encoding: "utf8",
    windowsHide: true,
    timeout: 600000,
    maxBuffer: 16 * 1024 * 1024,
  },
);
if (start.status !== 0) {
  console.error(
    "Local Supabase could not start. Check Docker availability and image downloads.",
  );
  process.exit(1);
}
const migration = spawnSync(
  process.execPath,
  ["node_modules/supabase/dist/supabase.js", "migration", "up", "--local"],
  { encoding: "utf8", windowsHide: true, timeout: 60000 },
);
if (migration.status !== 0) {
  console.error("Local database migrations failed.");
  process.exit(1);
}
console.log(
  "Local Supabase is ready; migrations applied. Credentials were not logged.",
);
