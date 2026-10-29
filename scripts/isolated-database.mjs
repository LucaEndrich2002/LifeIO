import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import {
  dockerCommand,
  isLocalDockerEndpoint,
  readDockerEndpoint,
} from "./local-docker.mjs";

const root = new URL("../", import.meta.url);
export const read = (path) => readFileSync(new URL(path, root), "utf8");
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
class RehearsalError extends Error {}
export function check(condition, message) {
  if (!condition) throw new RehearsalError(message);
}
export function same(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), message);
}

// Internal harness: fixed repository rehearsals, never a user target.
export async function withIsolatedDatabase(kind, run) {
  check(
    ["restore", "migration", "migration-cli"].includes(kind),
    "Unknown rehearsal",
  );
  const cli = kind === "migration-cli";
  const image = "public.ecr.aws/supabase/postgres:17.6.1.167";
  const name = `lifeos-${kind}-${randomUUID()}`;
  const label = `io.lifeos.${kind}-rehearsal`;
  const source = "postgres";
  const target = "lifeos_restore_target";
  const endpoint = readDockerEndpoint();
  let container;
  let network;
  const password = `fictional-${randomUUID()}`;
  let phase = "local environment validation";
  const env = { ...process.env };
  delete env.DOCKER_CONTEXT;
  delete env.DOCKER_HOST;

  function docker(args, { input, timeout = 30000, optional = false } = {}) {
    const result = spawnSync(dockerCommand, ["--host", endpoint, ...args], {
      env,
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });
    // Raw subprocess output can contain fixture records or database credentials.
    if (!optional)
      check(!result.error && result.status === 0, "Command failed");
    return result;
  }
  function sql(database, query, role = "supabase_admin") {
    check(
      container && [source, target].includes(database),
      "Invalid test target",
    );
    return docker(
      [
        "exec",
        "-i",
        "-e",
        "PGOPTIONS=-c statement_timeout=15000 -c lock_timeout=3000",
        container,
        "psql",
        "-U",
        role,
        "-d",
        database,
        "--no-psqlrc",
        "--set",
        "ON_ERROR_STOP=1",
        "-qAt",
      ],
      { input: query },
    ).stdout.trim();
  }
  function cleanup() {
    if (container) {
      const owned = docker([
        "inspect",
        "--format",
        `{{index .Config.Labels "${label}"}}`,
        container,
      ]);
      check(
        owned.stdout.trim() === name,
        "Cleanup refused: container label changed",
      );
      // Only this invocation's validated ID; includes only its anonymous volumes.
      docker(["rm", "--force", "--volumes", container]);
      container = undefined;
    }
    if (network) {
      const owned = docker([
        "network",
        "inspect",
        "--format",
        `{{index .Labels "${label}"}}`,
        network,
      ]);
      check(
        owned.stdout.trim() === name,
        "Cleanup refused: network label changed",
      );
      docker(["network", "rm", network]);
      network = undefined;
    }
  }
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      try {
        cleanup();
      } catch {
        console.error(`Cleanup required for ${name}.`);
      }
      process.exit(130);
    });
  }

  try {
    check(process.argv.length === 2, "This rehearsal accepts no arguments");
    check(
      isLocalDockerEndpoint(endpoint),
      "A local Docker endpoint is required",
    );
    docker(["image", "inspect", image]); // Never pull an image implicitly.
    if (cli) {
      const version = docker([
        "version",
        "--format",
        "{{.Server.Version}}",
      ]).stdout.trim();
      check(
        /^\d+\./.test(version) && Number(version.split(".")[0]) >= 28,
        "CLI rehearsal requires Docker 28+ for loopback port isolation",
      );
      phase = "private CLI network creation";
      network = docker([
        "network",
        "create",
        "--driver",
        "bridge",
        "--opt",
        "com.docker.network.bridge.enable_ip_masquerade=false",
        "--opt",
        "com.docker.network.bridge.gateway_mode_ipv4=nat",
        "--label",
        `${label}=${name}`,
        name,
      ]).stdout.trim();
      check(/^[a-f0-9]{64}$/.test(network), "Invalid network ID");
    }
    phase = "isolated container creation";
    container = docker([
      "create",
      "--pull=never",
      "--name",
      name,
      "--label",
      `${label}=${name}`,
      ...(cli
        ? [
            "--network",
            network,
            "--dns",
            "127.0.0.1",
            "--publish",
            "127.0.0.1::5432",
          ]
        : ["--network=none"]),
      "--memory=768m",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,size=536870912",
      "--env",
      `POSTGRES_PASSWORD=${password}`,
      image,
      "postgres",
      "-c",
      "config_file=/etc/postgresql/postgresql.conf",
      "-c",
      "shared_buffers=32MB",
      "-c",
      "max_connections=30",
    ]).stdout.trim();
    check(/^[a-f0-9]{64}$/.test(container), "Invalid container ID");
    docker(["start", container]);
    phase = "isolated database startup";
    let ready = false;
    for (let attempt = 0; attempt < 45; attempt++) {
      const result = docker(
        ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        // Docker Desktop can take several seconds to exec into a new bridge.
        // Keep the actual readiness check; do not treat a running PID as ready.
        { optional: true, timeout: cli ? 15000 : 2000 },
      );
      if (result.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    check(ready, "Database startup timed out");
    check(
      sql(source, "show data_directory;") === "/var/lib/postgresql/data",
      "Data must use the private tmpfs mount",
    );
    if (!cli)
      sql(
        source,
        "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);",
        "postgres",
      );
    const migrations = readdirSync(
      new URL("supabase/migrations/", root),
    ).sort();
    for (const filename of migrations)
      check(
        /^\d{14}_[a-z0-9_]+\.sql$/.test(filename),
        "Unexpected migration filename",
      );
    function migrate(filename) {
      check(migrations.includes(filename), "Unknown migration");
      phase = `migration ${filename}`;
      const content = read(`supabase/migrations/${filename}`);
      sql(
        source,
        `begin; ${content}\ninsert into supabase_migrations.schema_migrations values (${literal(filename.slice(0, 14))}, array[${literal(content)}], ${literal(filename.slice(15, -4))}); commit;`,
        "postgres",
      );
    }
    await run({
      sql,
      docker,
      container,
      source,
      target,
      migrations,
      migrate,
      // Only the CLI rehearsal gets a connection, derived from its own container.
      cliConnection: cli
        ? () => {
            const info = JSON.parse(docker(["inspect", container]).stdout)[0];
            const net = JSON.parse(
              docker(["network", "inspect", network]).stdout,
            )[0];
            check(
              info.Id === container &&
                info.State.Running &&
                info.Config.Labels[label] === name,
              "CLI target ownership changed",
            );
            check(
              net.Id === network &&
                net.Driver === "bridge" &&
                !net.Internal &&
                net.Options[
                  "com.docker.network.bridge.enable_ip_masquerade"
                ] === "false" &&
                net.Options["com.docker.network.bridge.gateway_mode_ipv4"] ===
                  "nat" &&
                net.Labels[label] === name &&
                Object.keys(net.Containers).length === 1 &&
                net.Containers[container] &&
                Object.values(info.NetworkSettings.Networks).length === 1 &&
                Object.values(info.NetworkSettings.Networks)[0].NetworkID ===
                  network,
              "CLI target network changed",
            );
            const ports = info.NetworkSettings.Ports;
            const binding = ports["5432/tcp"];
            check(
              Object.keys(ports).length === 1 &&
                binding?.length === 1 &&
                binding[0].HostIp === "127.0.0.1" &&
                /^\d+$/.test(binding[0].HostPort) &&
                Number(binding[0].HostPort) >= 1024 &&
                Number(binding[0].HostPort) <= 65535 &&
                Number(binding[0].HostPort) !== 54322,
              "CLI target must have a private loopback port",
            );
            return `postgresql://postgres:${password}@127.0.0.1:${binding[0].HostPort}/postgres?sslmode=disable`;
          }
        : undefined,
      setPhase: (value) => {
        phase = value;
      },
    });
  } catch (error) {
    console.error(
      `${kind} rehearsal failed during ${phase}. Database output and record contents were withheld.`,
    );
    if (error instanceof RehearsalError) console.error(error.message);
    process.exitCode = 1;
  } finally {
    try {
      cleanup();
    } catch {
      console.error(
        `Cleanup failed; inspect only the rehearsal container ${name}.`,
      );
      process.exitCode = 1;
    }
  }
}
