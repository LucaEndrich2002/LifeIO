import { randomUUID } from "node:crypto";
import { check, same, withIsolatedDatabase } from "./isolated-database.mjs";

await withIsolatedDatabase(
  "auth-source",
  async ({ sql, source, migrations, migrate, startAuthServices, setPhase }) => {
    for (const filename of migrations) migrate(filename);
    setPhase("isolated Auth and mailbox startup");
    const services = startAuthServices();
    async function request(origin, path, { body, token } = {}) {
      const response = await fetch(`${origin()}${path}`, {
        method: body === undefined ? "GET" : "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        check(size <= 65536, "Auth test response too large");
        chunks.push(Buffer.from(chunk));
      }
      return {
        status: response.status,
        data: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      };
    }
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const health = await request(services.origin, "/health");
        const mailbox = await request(services.mailOrigin, "/api/v1/messages");
        if (health.status === 200 && mailbox.status === 200) {
          ready = true;
          break;
        }
      } catch {
        /* Startup may not yet be listening; no raw errors or credentials. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    check(ready, "Auth test services did not become healthy");

    async function confirmationHash(email) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const found = await request(
          services.mailOrigin,
          `/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        check(
          found.status === 200 && Array.isArray(found.data.messages),
          "Test inbox search failed",
        );
        for (const message of found.data.messages) {
          check(
            typeof message.ID === "string" &&
              /^[a-zA-Z0-9_-]+$/.test(message.ID),
            "Invalid test message ID",
          );
          const content = await request(
            services.mailOrigin,
            `/api/v1/message/${message.ID}`,
          );
          check(
            content.status === 200 && typeof content.data.HTML === "string",
            "Test message unreadable",
          );
          for (const [, href] of content.data.HTML.matchAll(
            /href="([^"]+)"/g,
          )) {
            const url = new URL(href.replaceAll("&amp;", "&"));
            if (
              url.origin !== services.origin() ||
              url.pathname !== "/verify" ||
              url.searchParams.get("type") !== "signup"
            )
              continue;
            const hash = url.searchParams.get("token");
            check(
              hash &&
                /^[a-f0-9]+$/.test(hash) &&
                hash.length >= 40 &&
                hash.length <= 128,
              "Invalid confirmation hash",
            );
            return hash;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Local confirmation message was not received");
    }
    const accounts = [];
    for (let index = 0; index < 2; index++) {
      setPhase(`fictional account ${index + 1} registration and confirmation`);
      const email = `auth-source-${randomUUID()}@example.test`;
      const password = `Fictional-${randomUUID()}!`;
      const signup = await request(services.origin, "/signup", {
        body: { email, password },
      });
      check(
        signup.status === 200 && !signup.data.access_token,
        "Signup must require confirmation",
      );
      const id = signup.data.id;
      check(
        typeof id === "string" &&
          /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id),
        "Signup did not return a valid identity",
      );
      const blocked = await request(
        services.origin,
        "/token?grant_type=password",
        { body: { email, password } },
      );
      check(
        blocked.status === 400 &&
          blocked.data.error_code === "email_not_confirmed" &&
          !blocked.data.access_token,
        "Unconfirmed account was not rejected correctly",
      );
      const confirmed = await request(services.origin, "/verify", {
        body: { type: "signup", token_hash: await confirmationHash(email) },
      });
      check(
        confirmed.status === 200 &&
          confirmed.data.user?.id === id &&
          confirmed.data.user.email_confirmed_at,
        "Email confirmation failed",
      );
      const wrong = await request(
        services.origin,
        "/token?grant_type=password",
        { body: { email, password: `Wrong-${randomUUID()}` } },
      );
      check(
        wrong.status === 400 &&
          wrong.data.error_code === "invalid_credentials" &&
          !wrong.data.access_token,
        "Wrong password was not rejected correctly",
      );
      const login = await request(
        services.origin,
        "/token?grant_type=password",
        { body: { email, password } },
      );
      check(
        login.status === 200 &&
          login.data.user?.id === id &&
          typeof login.data.access_token === "string",
        "Password login failed",
      );
      accounts.push({ id, token: login.data.access_token });
    }
    setPhase(
      "identity, rejected credentials and application profile verification",
    );
    check(accounts[0].id !== accounts[1].id, "Distinct accounts required");
    for (const account of accounts) {
      sql(
        source,
        `begin; set local role authenticated; set local request.jwt.claim.sub='${account.id}'; insert into public.profiles(user_id,display_name,time_zone) values('${account.id}','Fiktive Auth-Probe','Europe/Berlin'); commit;`,
      );
    }
    const anonymous = await request(services.origin, "/user");
    check(
      anonymous.status === 401 &&
        anonymous.data.error_code === "no_authorization" &&
        !anonymous.data.id,
      "Anonymous identity endpoint access was not rejected correctly",
    );
    for (const account of accounts) {
      const user = await request(services.origin, "/user", {
        token: account.token,
      });
      check(
        user.status === 200 && user.data.id === account.id,
        "Access token returned another identity",
      );
      const parts = account.token.split(".");
      check(
        parts.length === 3 && parts[2].length > 1,
        "Unexpected access token format",
      );
      parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
      const forged = await request(services.origin, "/user", {
        token: parts.join("."),
      });
      check(
        forged.status === 403 &&
          forged.data.error_code === "bad_jwt" &&
          !forged.data.id,
        "Tampered token was not rejected correctly",
      );
      // This SQL assertion checks profile ownership only. It is not a
      // substitute for a later restored PostgREST request with the issued JWT.
      same(
        sql(
          source,
          `begin; set local role authenticated; set local request.jwt.claim.sub='${account.id}'; select user_id from public.profiles; rollback;`,
        ),
        account.id,
        "Profile owner isolation failed",
      );
    }
    check(
      sql(source, "select count(*) from auth.users;") === "2",
      "Unexpected account population",
    );
    check(
      sql(source, "select count(*) from public.profiles;") === "2",
      "Expected two application profiles",
    );
    console.log(
      "Auth source passed: two API-created accounts, local email confirmation, blocked unconfirmed/wrong-password login, valid and tampered tokens, profiles and SQL owner isolation. No restore performed.",
    );
  },
);
