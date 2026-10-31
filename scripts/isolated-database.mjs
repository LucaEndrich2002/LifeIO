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
const activeCleanups = new Map();
function interruptRehearsals() {
  // Nested source/target rehearsals must both clean up before exiting.
  for (const [cleanup, name] of [...activeCleanups].reverse()) {
    try {
      cleanup();
    } catch {
      console.error(`Cleanup required for ${name}.`);
    }
  }
  process.exit(130);
}
export function check(condition, message) {
  if (!condition) throw new RehearsalError(message);
}
export function same(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), message);
}

// Internal harness: fixed repository rehearsals, never a user target.
export async function withIsolatedDatabase(kind, run) {
  check(
    [
      "restore",
      "migration",
      "migration-cli",
      "auth-source",
      "auth-target",
    ].includes(kind),
    "Unknown rehearsal",
  );
  const cli = kind === "migration-cli";
  const authSource = kind === "auth-source";
  const authTarget = kind === "auth-target";
  const auth = authSource || authTarget;
  const networked = cli || auth;
  const httpPorts = authTarget ? [9999, 8025, 3001] : [9999, 8025];
  const services = [];
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

  function docker(
    args,
    { input, timeout = 30000, optional = false, encoding = "utf8" } = {},
  ) {
    const result = spawnSync(dockerCommand, ["--host", endpoint, ...args], {
      env,
      input,
      encoding,
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
    for (const id of [...services].reverse()) {
      const owned = docker([
        "inspect",
        "--format",
        `{{index .Config.Labels "${label}"}}`,
        id,
      ]);
      check(
        owned.stdout.trim() === name,
        "Cleanup refused: service label changed",
      );
      docker(["rm", "--force", "--volumes", id]);
      services.splice(services.indexOf(id), 1);
    }
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
  if (activeCleanups.size === 0)
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, interruptRehearsals);
  activeCleanups.set(cleanup, name);

  try {
    check(process.argv.length === 2, "This rehearsal accepts no arguments");
    check(
      isLocalDockerEndpoint(endpoint),
      "A local Docker endpoint is required",
    );
    docker(["image", "inspect", image]); // Never pull an image implicitly.
    if (networked) {
      const version = docker([
        "version",
        "--format",
        "{{.Server.Version}}",
      ]).stdout.trim();
      check(
        /^\d+\./.test(version) && Number(version.split(".")[0]) >= 28,
        "Networked rehearsal requires Docker 28+ for loopback port isolation",
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
      ...(networked
        ? [
            "--network",
            network,
            "--dns",
            "127.0.0.1",
            ...(cli
              ? ["--publish", "127.0.0.1::5432"]
              : httpPorts.flatMap((port) => [
                  "--publish",
                  `127.0.0.1::${port}`,
                ])),
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
        { optional: true, timeout: networked ? 15000 : 2000 },
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
    if (!cli && !authTarget)
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
    function inspectNetworkTarget() {
      const info = JSON.parse(docker(["inspect", container]).stdout)[0];
      const net = JSON.parse(docker(["network", "inspect", network]).stdout)[0];
      check(
        info.Id === container &&
          info.State.Running &&
          info.Config.Labels[label] === name &&
          net.Id === network &&
          net.Labels[label] === name &&
          net.Driver === "bridge" &&
          !net.Internal &&
          net.Options["com.docker.network.bridge.enable_ip_masquerade"] ===
            "false" &&
          net.Options["com.docker.network.bridge.gateway_mode_ipv4"] ===
            "nat" &&
          Object.keys(net.Containers).length === 1 &&
          net.Containers[container] &&
          Object.values(info.NetworkSettings.Networks).length === 1 &&
          Object.values(info.NetworkSettings.Networks)[0].NetworkID === network,
        "Test network ownership changed",
      );
      return info;
    }
    function authOrigin(port) {
      check(auth && httpPorts.includes(port), "Unknown Auth test endpoint");
      const info = inspectNetworkTarget();
      const published = Object.entries(info.NetworkSettings.Ports).filter(
        ([, bindings]) => bindings?.length,
      );
      check(
        published.length === httpPorts.length &&
          published.every(
            ([key, bindings]) =>
              httpPorts.some((allowed) => key === `${allowed}/tcp`) &&
              bindings.length === 1 &&
              bindings[0].HostIp === "127.0.0.1" &&
              /^\d+$/.test(bindings[0].HostPort) &&
              Number(bindings[0].HostPort) >= 1024 &&
              Number(bindings[0].HostPort) <= 65535 &&
              ![3000, 54321, 54322, 54323, 54324].includes(
                Number(bindings[0].HostPort),
              ),
          ),
        "Auth test ports must be private loopback bindings",
      );
      for (const id of services) {
        const service = JSON.parse(docker(["inspect", id]).stdout)[0];
        check(
          service.Id === id &&
            service.State.Running &&
            service.Config.Labels[label] === name &&
            service.HostConfig.NetworkMode === `container:${container}`,
          "Auth service ownership changed",
        );
      }
      return `http://127.0.0.1:${info.NetworkSettings.Ports[`${port}/tcp`][0].HostPort}`;
    }
    function startAuthServices(database = source) {
      check(
        auth && services.length === 0 && [source, target].includes(database),
        "Auth services already started or unavailable",
      );
      const authImage = "public.ecr.aws/supabase/gotrue:v2.196.0";
      const mailImage = "public.ecr.aws/supabase/mailpit:v1.30.2";
      const restImage = "public.ecr.aws/supabase/postgrest:v16.2";
      const jwtSecret = `${randomUUID()}${randomUUID()}`;
      for (const serviceImage of [
        authImage,
        mailImage,
        ...(authTarget ? [restImage] : []),
      ])
        docker(["image", "inspect", serviceImage]);
      const origin = authOrigin(9999);
      sql(
        source,
        `alter role supabase_auth_admin password ${literal(password)};`,
      );
      const specs = [
        [
          "mail",
          mailImage,
          "128m",
          [
            "MP_DATABASE=/tmp/mailpit.db",
            "MP_MAX_MESSAGES=10",
            "MP_SMTP_BIND_ADDR=127.0.0.1:1025",
            "MP_UI_BIND_ADDR=0.0.0.0:8025",
          ],
        ],
        [
          "auth",
          authImage,
          "256m",
          [
            "GOTRUE_API_HOST=0.0.0.0",
            "GOTRUE_API_PORT=9999",
            `API_EXTERNAL_URL=${origin}`,
            "GOTRUE_SITE_URL=http://127.0.0.1:3000",
            "GOTRUE_DB_DRIVER=postgres",
            `GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:${password}@127.0.0.1:5432/${database}?sslmode=disable`,
            "GOTRUE_DB_MAX_POOL_SIZE=5",
            `GOTRUE_JWT_SECRET=${jwtSecret}`,
            "GOTRUE_JWT_AUD=authenticated",
            "GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated",
            "GOTRUE_JWT_EXP=3600",
            "GOTRUE_EXTERNAL_EMAIL_ENABLED=true",
            "GOTRUE_MAILER_AUTOCONFIRM=false",
            "GOTRUE_SMTP_HOST=127.0.0.1",
            "GOTRUE_SMTP_PORT=1025",
            "GOTRUE_SMTP_ADMIN_EMAIL=auth@example.test",
            "GOTRUE_RATE_LIMIT_EMAIL_SENT=10",
            "GOTRUE_TRACING_ENABLED=false",
            "LOG_LEVEL=error",
          ],
        ],
      ];
      if (authTarget) {
        sql(source, `alter role authenticator password ${literal(password)};`);
        specs.push([
          "rest",
          restImage,
          "128m",
          [
            `PGRST_DB_URI=postgresql://authenticator:${password}@127.0.0.1:5432/${database}?sslmode=disable`,
            "PGRST_DB_SCHEMAS=public",
            "PGRST_DB_ANON_ROLE=anon",
            "PGRST_DB_POOL=5",
            "PGRST_DB_CONFIG=false",
            `PGRST_JWT_SECRET=${jwtSecret}`,
            "PGRST_JWT_AUD=authenticated",
            "PGRST_SERVER_HOST=0.0.0.0",
            "PGRST_SERVER_PORT=3001",
            "PGRST_LOG_LEVEL=crit",
          ],
        ]);
      }
      let authService;
      for (const [suffix, serviceImage, memory, values] of specs) {
        const id = docker([
          "create",
          "--pull=never",
          "--name",
          `${name}-${suffix}`,
          "--label",
          `${label}=${name}`,
          "--network",
          `container:${container}`,
          "--memory",
          memory,
          "--log-driver=none",
          "--tmpfs",
          "/tmp:rw,size=33554432",
          ...values.flatMap((value) => ["--env", value]),
          serviceImage,
        ]).stdout.trim();
        check(/^[a-f0-9]{64}$/.test(id), "Invalid Auth service ID");
        services.push(id);
        if (suffix === "auth") authService = id;
        docker(["start", id]);
      }
      return {
        origin: () => authOrigin(9999),
        mailOrigin: () => authOrigin(8025),
        ...(authTarget ? { restOrigin: () => authOrigin(3001) } : {}),
        restartAuth: () => {
          authOrigin(9999); // Validate ownership before restarting our service.
          docker(["restart", authService]);
        },
      };
    }
    await run({
      sql,
      docker,
      container,
      source,
      target,
      migrations,
      migrate,
      startAuthServices: auth ? startAuthServices : undefined,
      // Only the CLI rehearsal gets a connection, derived from its own container.
      cliConnection: cli
        ? () => {
            const info = inspectNetworkTarget();
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
    } finally {
      activeCleanups.delete(cleanup);
      if (activeCleanups.size === 0)
        for (const signal of ["SIGINT", "SIGTERM"])
          process.removeListener(signal, interruptRehearsals);
    }
  }
}
