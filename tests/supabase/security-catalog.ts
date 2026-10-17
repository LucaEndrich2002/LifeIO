import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  dockerCommand,
  isLocalDockerEndpoint,
  readDockerEndpoint,
} from "../../scripts/local-docker.mjs";

const catalogSchema = z.object({
  roles: z.array(
    z.object({
      name: z.string(),
      superuser: z.boolean(),
      bypassRls: z.boolean(),
      createRole: z.boolean(),
      createDatabase: z.boolean(),
      replication: z.boolean(),
      createInPublic: z.boolean(),
      memberOf: z.array(z.string()),
    }),
  ),
  relations: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      owner: z.string(),
      rls: z.boolean(),
      ownerColumnRequired: z.boolean(),
      access: z.array(
        z.object({
          role: z.string(),
          tablePrivileges: z.array(z.string()),
          columnPrivileges: z.array(z.string()),
        }),
      ),
      policies: z.array(
        z.object({
          name: z.string(),
          command: z.string(),
          permissive: z.boolean(),
          roles: z.array(z.string()),
          using: z.string().nullable(),
          check: z.string().nullable(),
        }),
      ),
    }),
  ),
  functions: z.array(
    z.object({
      signature: z.string(),
      owner: z.string(),
      definer: z.boolean(),
      kind: z.string(),
      configuration: z.array(z.string()),
      result: z.string(),
      anonymousExecute: z.boolean(),
      authenticatedExecute: z.boolean(),
      authenticatedGrant: z.boolean(),
    }),
  ),
});

/** Test-only catalog read; privileged credentials never enter the app. */
export function readSecurityCatalog() {
  let localSupabase = false;
  try {
    const endpoint = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    localSupabase =
      ["http:", "https:"].includes(endpoint.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  } catch {
    // Configuration errors must not echo environment values.
  }
  if (!localSupabase || !isLocalDockerEndpoint(readDockerEndpoint())) {
    throw new Error(
      "Security catalog checks require the local Supabase runner and local Docker.",
    );
  }
  const result = spawnSync(
    dockerCommand,
    [
      "exec",
      "-i",
      "supabase_db_lifeos",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-qAt",
    ],
    {
      input: readFileSync(
        new URL("./security-catalog.sql", import.meta.url),
        "utf8",
      ),
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0)
    throw new Error("Local security catalog read failed.");
  return catalogSchema.parse(JSON.parse(result.stdout));
}
