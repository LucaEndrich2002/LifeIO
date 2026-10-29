import { withIsolatedDatabase } from "./isolated-database.mjs";
import { rehearseExistingData } from "./migration-scenario.mjs";

await withIsolatedDatabase("migration", async (context) => {
  await rehearseExistingData({
    ...context,
    apply: (files) => files.forEach(context.migrate),
  });
  console.log(
    `Migration passed: three legacy accounts preserved through ${context.migrations.length} SQL files; savings backfill, resumed setup, historical rates and owner/foreign/anonymous controls verified at both checkpoints.`,
  );
});
