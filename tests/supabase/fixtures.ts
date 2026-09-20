import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.LIFEOS_TEST_SERVICE_KEY;
const mailUrl = process.env.LIFEOS_TEST_MAIL_URL;
if (!url || !publicKey || !serviceKey || !mailUrl)
  throw new Error("Use the local Supabase test runner.");
for (const endpoint of [url, mailUrl]) {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(endpoint).hostname))
    throw new Error("Test fixtures require loopback endpoints.");
}
export const testMailUrl = mailUrl;
export const testSupabaseUrl = url;
export const testPublicKey = publicKey;
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
// Admin privileges are confined to fixture creation and removal on local Supabase.
const admin = createClient<Database>(url, serviceKey, options);
export const publicClient = () =>
  createClient<Database>(url, publicKey, options);
export const fixtureCredentials = () => ({
  email: `lifeos-test-${randomUUID()}@example.test`,
  password: `LifeOS-test-${randomUUID()}`,
});

export async function createFixture() {
  const credentials = fixtureCredentials();
  const { data, error } = await admin.auth.admin.createUser({
    ...credentials,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error("Local auth fixture creation failed.");
  const client = publicClient();
  const login = await client.auth.signInWithPassword(credentials);
  if (login.error) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error("Local auth fixture sign-in failed.");
  }
  return { ...credentials, id: data.user.id, client };
}

export async function removeFixture(id: string) {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error("Could not remove a local auth fixture.");
}

export async function removeFixtureByEmail(email: string) {
  if (!/^lifeos-test-[0-9a-f-]+@example\.test$/.test(email))
    throw new Error("Refusing non-fixture cleanup.");
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error("Could not locate a local auth fixture.");
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) {
      await removeFixture(user.id);
      return;
    }
    if (data.users.length < 100) return;
  }
}

export async function mailCode(
  email: string,
  subject: string,
): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(
      `${mailUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    if (!response.ok) throw new Error("Local test inbox unavailable.");
    const result = (await response.json()) as {
      messages: { ID: string; Subject: string }[];
    };
    const message = result.messages.find((item) => item.Subject === subject);
    if (message) {
      const content = (await fetch(
        `${mailUrl}/api/v1/message/${message.ID}`,
      ).then((value) => value.json())) as { Text: string; HTML: string };
      const code = (content.Text || content.HTML).match(/\b\d{6}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("No confirmation code received in the local test inbox.");
}
