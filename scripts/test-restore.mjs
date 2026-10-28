import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import {
  dockerCommand,
  isLocalDockerEndpoint,
  readDockerEndpoint,
} from "./local-docker.mjs";

// No target arguments, credentials, source database or dump files are accepted.
// Every SQL command is confined to the container created by this invocation.
const root = new URL("../", import.meta.url);
const image = "public.ecr.aws/supabase/postgres:17.6.1.167";
const name = `lifeos-restore-${randomUUID()}`;
const label = "io.lifeos.restore-rehearsal";
const source = "postgres";
const target = "lifeos_restore_target";
const endpoint = readDockerEndpoint();
let container;
let phase = "local environment validation";
const env = { ...process.env };
delete env.DOCKER_CONTEXT;
delete env.DOCKER_HOST;

class RehearsalError extends Error {}
function check(condition, message) {
  if (!condition) throw new RehearsalError(message);
}
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
  if (!optional) check(!result.error && result.status === 0, "Command failed");
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
const read = (path) => readFileSync(new URL(path, root), "utf8");
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
function catalog(database) {
  return JSON.parse(sql(database, read("tests/supabase/security-catalog.sql")));
}
function rows(database) {
  const tables = JSON.parse(
    sql(
      database,
      `
    select jsonb_agg(n.nspname || '.' || c.relname order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','supabase_migrations') and c.relkind='r';
  `,
    ),
  );
  return Object.fromEntries(
    tables.map((table) => {
      check(
        /^(public|auth|supabase_migrations)\.[a-z_][a-z0-9_]*$/.test(table),
        "Unexpected table",
      );
      const value = JSON.parse(
        sql(
          database,
          `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from ${table} t;`,
        ),
      );
      return [table, value];
    }),
  );
}
function schema(database) {
  return JSON.parse(sql(database, read("tests/recovery/schema.sql")));
}
function same(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), message);
}
function cleanup() {
  if (!container) return;
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
  check(isLocalDockerEndpoint(endpoint), "A local Docker endpoint is required");
  docker(["image", "inspect", image]); // Never pull an image implicitly.
  phase = "isolated container creation";
  container = docker([
    "create",
    "--pull=never",
    "--name",
    name,
    "--label",
    `${label}=${name}`,
    "--network=none",
    "--memory=768m",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,size=536870912",
    "--env",
    `POSTGRES_PASSWORD=fictional-${randomUUID()}`,
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
      { optional: true, timeout: 2000 },
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
  sql(
    source,
    "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);",
    "postgres",
  );
  const migrations = readdirSync(new URL("supabase/migrations/", root)).sort();
  for (const filename of migrations) {
    check(
      /^\d{14}_[a-z0-9_]+\.sql$/.test(filename),
      "Unexpected migration filename",
    );
    phase = `migration ${filename}`;
    const content = read(`supabase/migrations/${filename}`);
    sql(
      source,
      `begin; ${content}\ninsert into supabase_migrations.schema_migrations values (${literal(filename.slice(0, 14))}, array[${literal(content)}], ${literal(filename.slice(15, -4))}); commit;`,
      "postgres",
    );
  }
  phase = "fictional data setup";
  sql(source, read("tests/recovery/fixtures.sql"));
  phase = "source access controls";
  sql(source, read("tests/recovery/verify-access.sql"));
  const before = {
    catalog: catalog(source),
    rows: rows(source),
    schema: schema(source),
  };
  check(
    before.catalog.relations.length === 15 &&
      before.catalog.functions.length === 28,
    "Review the application inventory before extending this rehearsal",
  );
  check(
    before.catalog.roles.every((role) => !role.superuser && !role.bypassRls),
    "API roles must not bypass RLS",
  );
  for (const relation of before.catalog.relations) {
    check(
      relation.rls && before.rows[`public.${relation.name}`]?.length >= 2,
      "Every application table must have RLS and populated two-user fixtures",
    );
  }
  check(
    before.rows["auth.users"]?.length === 2,
    "Expected exactly two fictional account references",
  );
  check(
    before.rows["supabase_migrations.schema_migrations"]?.length ===
      migrations.length,
    "Missing migration history",
  );
  console.log(
    "Isolated source prepared: 15 populated application tables, two fictional users, access controls verified.",
  );

  phase = "logical backup";
  docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "supabase_admin",
    "-d",
    source,
    "--format=custom",
    "--schema=public",
    "--schema=auth",
    "--schema=supabase_migrations",
    "--file=/tmp/lifeos-rehearsal.dump",
  ]);
  phase = "empty restore target";
  sql(source, `create database ${target} template template0 owner postgres;`);
  sql(target, "drop schema public;");
  check(
    sql(
      target,
      "select count(*) from pg_tables where schemaname in ('public','auth','supabase_migrations');",
    ) === "0",
    "Restore target must be empty",
  );
  phase = "restore into the empty database";
  docker([
    "exec",
    container,
    "pg_restore",
    "-U",
    "supabase_admin",
    "--dbname",
    target,
    "--exit-on-error",
    "--single-transaction",
    "/tmp/lifeos-rehearsal.dump",
  ]);
  phase = "restored data, schema and privileges";
  same(rows(target), before.rows, "Restored rows differ (contents omitted)");
  same(catalog(target), before.catalog, "Restored privileges differ");
  same(
    schema(target),
    before.schema,
    "Restored definitions or constraints differ",
  );
  phase = "restored access controls and writable owner flow";
  sql(target, read("tests/recovery/verify-access.sql"));
  same(
    rows(target),
    before.rows,
    "Access checks must roll back their test writes",
  );
  console.log(
    `Restore passed: all rows, schema definitions, constraints, indexes, triggers, rights and ${migrations.length} migration records match; owner/foreign/anonymous checks passed.`,
  );
} catch (error) {
  console.error(
    `Restore rehearsal failed during ${phase}. Database output and record contents were withheld.`,
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
