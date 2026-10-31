import { check, same } from "./isolated-database.mjs";

// Only called for an empty, disposable database created by our harness.
export function restoreArchive({ sql, docker, container }, database, archive) {
  same(
    sql(
      database,
      "select count(*) from pg_tables where schemaname in ('public','auth','supabase_migrations');",
    ),
    "0",
    "Restore database must be empty",
  );
  same(
    sql(
      database,
      "select pg_get_userbyid(nspowner) from pg_namespace where nspname='public';",
    ),
    "pg_database_owner",
    "Unexpected public-schema baseline owner",
  );
  const list = docker(["exec", "-i", container, "pg_restore", "--list"], {
    input: archive,
  }).stdout;
  const lines = list.split("\n");
  const publicSchema = /^\d+; \d+ \d+ SCHEMA - public pg_database_owner\r?$/;
  check(
    lines.filter((line) => publicSchema.test(line)).length === 1,
    "Expected exactly one standard public schema in the archive",
  );
  // Keep initdb's public schema: pg_dump's ACL is relative to its defaults.
  // Skip only its duplicate CREATE, retaining every ACL/comment/data entry.
  const selection = lines
    .map((line) => (publicSchema.test(line) ? `;${line}` : line))
    .join("\n");
  docker(["exec", "-i", container, "tee", "/tmp/lifeos-restore.list"], {
    input: selection,
  });
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "supabase_admin",
      "--dbname",
      database,
      "--exit-on-error",
      "--single-transaction",
      "--use-list=/tmp/lifeos-restore.list",
    ],
    { input: archive },
  );
}
