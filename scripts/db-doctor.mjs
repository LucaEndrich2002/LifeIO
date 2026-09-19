import { spawnSync } from "node:child_process";
import { statfs } from "node:fs/promises";
import { totalmem } from "node:os";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import {
  dockerCommand,
  isLocalDockerEndpoint,
  readDockerEndpoint,
} from "./local-docker.mjs";

const { values } = parseArgs({
  options: {
    "storage-path": { type: "string" },
    runtime: { type: "boolean", default: false },
  },
});
const storagePath =
  values["storage-path"] ?? fileURLToPath(new URL("../", import.meta.url));
const gib = 1024 ** 3;
const requiredFreeGiB = values.runtime ? 5 : 20;
let blockers = 0;

function report(ok, message) {
  console.log(`[${ok ? "OK" : "BLOCKED"}] ${message}`);
  if (!ok) blockers += 1;
}

function run(command, args) {
  return spawnSync(command, args, { timeout: 15_000, windowsHide: true });
}

function output(result) {
  const bytes = result.stdout ?? Buffer.alloc(0);
  // Windows' built-in WSL launcher may emit UTF-16 instead of UTF-8.
  return bytes.toString(bytes.includes(0) ? "utf16le" : "utf8").trim();
}

console.log("LifeOS local database prerequisites (read-only)");
report(
  totalmem() >= 8 * gib,
  `${(totalmem() / gib).toFixed(1)} GiB RAM; at least 8 GiB planned for local development.`,
);

try {
  const disk = await statfs(storagePath);
  const available = (disk.bavail * disk.bsize) / gib;
  report(
    available >= requiredFreeGiB,
    `${available.toFixed(1)} GiB free on the selected storage volume. LifeOS plans ${requiredFreeGiB} GiB of ${values.runtime ? "operating reserve for an already installed stack" : "installation and image reserve"} (not a vendor minimum).`,
  );
} catch {
  report(
    false,
    "Cannot inspect the selected storage volume. Use --storage-path with an existing directory.",
  );
}

if (process.platform === "win32") {
  const wsl = run("wsl.exe", ["--version"]);
  const version = output(wsl).match(/WSL[^\r\n]*?(\d+)\.(\d+)\.(\d+)/i);
  const parts = version?.slice(1, 4).map(Number);
  const supported =
    parts &&
    (parts[0] > 2 ||
      (parts[0] === 2 && (parts[1] > 1 || (parts[1] === 1 && parts[2] >= 5))));
  report(
    wsl.status === 0 && !!supported,
    supported
      ? `WSL ${parts.join(".")} is available.`
      : "WSL >= 2.1.5 is required for the planned Windows WSL 2 backend. See docs/LOCAL_SUPABASE.md.",
  );
}

const docker = dockerCommand;
const dockerVersion = run(docker, ["--version"]);
report(
  dockerVersion.status === 0,
  dockerVersion.status === 0
    ? "Docker CLI is available."
    : "Docker CLI is missing or cannot be executed; install/start Docker Desktop and reopen the terminal.",
);

if (dockerVersion.status === 0) {
  // Refuse to contact a remote daemon during a local-development check.
  const local = isLocalDockerEndpoint(readDockerEndpoint());
  report(
    local,
    local
      ? "Docker targets a local socket/loopback endpoint."
      : "No verified local Docker endpoint. Select a local context; no daemon was contacted.",
  );
  if (local) {
    const info = run(docker, ["info", "--format", "{{.OSType}}"]);
    report(
      info.status === 0 && output(info) === "linux",
      info.status === 0 && output(info) === "linux"
        ? "Docker engine is running Linux containers."
        : "A running Linux-container engine is required. Start Docker Desktop and check its backend.",
    );
  }
}

console.log(
  blockers
    ? `${blockers} prerequisite(s) need attention. Nothing was installed, started or deleted.`
    : values.runtime
      ? "Runtime prerequisites passed. Check Supabase service health separately."
      : "Prerequisites passed. Run pnpm db:start to initialize the local Supabase stack.",
);
console.log("This check does not validate Supabase health, migrations or RLS.");
process.exitCode = blockers ? 1 : 0;
