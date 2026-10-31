import { withIsolatedDatabase } from "./isolated-database.mjs";
import { prepareAuthSource } from "./auth-rehearsal.mjs";

await withIsolatedDatabase("auth-source", async (context) => {
  await prepareAuthSource(context);
  console.log(
    "Auth source passed: two API-created accounts, local email confirmation, blocked unconfirmed/wrong-password login, valid and tampered tokens, profiles and SQL owner isolation. No restore performed.",
  );
});
