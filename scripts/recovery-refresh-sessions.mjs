import { check, same } from "./isolated-database.mjs";
import { request } from "./auth-rehearsal.mjs";

// Tokens remain in memory. Only a validated session UUID is used in test SQL.
function session(response, account) {
  check(
    response.status === 200 &&
      response.data.user?.id === account.id &&
      typeof response.data.access_token === "string" &&
      typeof response.data.refresh_token === "string" &&
      response.data.refresh_token.length >= 12,
    "Restored session exchange failed",
  );
  const parts = response.data.access_token.split(".");
  check(parts.length === 3, "Unexpected target token format");
  const claims = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  );
  check(
    claims.sub === account.id &&
      claims.role === "authenticated" &&
      typeof claims.session_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        claims.session_id,
      ),
    "Target session has an unexpected identity or session ID",
  );
  return {
    access: response.data.access_token,
    refresh: response.data.refresh_token,
    id: claims.session_id,
  };
}

export async function verifyRefreshSessions({
  source,
  target,
  database,
  services,
  accounts,
  initial,
  controls,
  applicationTables,
}) {
  for (const table of applicationTables)
    check(
      /^public\.[a-z_][a-z0-9_]*$/.test(table),
      "Unexpected application table",
    );
  const query = `select jsonb_build_object(${applicationTables
    .map(
      (table) =>
        `'${table}',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from ${table} r)`,
    )
    .join(",")});`;
  const sourceBefore = source.sql(source.source, query);
  const targetBefore = target.sql(database, query);
  const current = initial.map((response, index) =>
    session(response, accounts[index]),
  );
  const independent = controls.map((response, index) =>
    session(response, accounts[index]),
  );
  for (const [index, value] of current.entries())
    check(
      value.id !== independent[index].id,
      "Control must use a separate login session",
    );

  const exists = (value, account) =>
    target.sql(
      database,
      `select count(*) from auth.sessions where id='${value.id}' and user_id='${account.id}';`,
    );
  async function authorized(value, index) {
    const account = accounts[index];
    const identity = await request(services.origin, "/user", {
      token: value.access,
    });
    check(
      identity.status === 200 && identity.data.id === account.id,
      "Refreshed token did not authenticate its owner",
    );
    const own = await request(
      services.restOrigin,
      "/profiles?select=user_id,display_name",
      { token: value.access },
    );
    same(
      own,
      {
        status: 200,
        data: [
          {
            user_id: account.id,
            display_name:
              index === 0 ? "Im Ziel gespeichert" : "Fiktive Auth-Probe",
          },
        ],
      },
      "Refreshed session exposed the wrong profile",
    );
    const income = await request(
      services.restOrigin,
      "/incomes?select=user_id,amount_minor,currency",
      { token: value.access },
    );
    same(
      income,
      {
        status: 200,
        data: [{ user_id: account.id, amount_minor: 280001, currency: "EUR" }],
      },
      "Refreshed session lost financial data isolation",
    );
    const foreign = await request(
      services.restOrigin,
      `/profiles?user_id=eq.${accounts[1 - index].id}&select=user_id`,
      { token: value.access },
    );
    same(
      foreign,
      { status: 200, data: [] },
      "Refreshed session exposed another account",
    );
  }
  async function refresh(value, index) {
    const result = session(
      await request(services.origin, "/token?grant_type=refresh_token", {
        body: { refresh_token: value.refresh },
      }),
      accounts[index],
    );
    check(
      result.id === value.id && result.refresh !== value.refresh,
      "Refresh must rotate the token within the same session",
    );
    same(
      exists(result, accounts[index]),
      "1",
      "Refreshed session is missing from restored Auth",
    );
    await authorized(result, index);
    return result;
  }
  async function denied(refreshToken) {
    const result = await request(
      services.origin,
      "/token?grant_type=refresh_token",
      {
        body: { refresh_token: refreshToken },
      },
    );
    check(
      result.status === 400 &&
        [
          "refresh_token_not_found",
          "refresh_token_already_used",
          "session_not_found",
        ].includes(result.data.error_code) &&
        !result.data.access_token &&
        !result.data.refresh_token,
      "Logged-out session was renewed or returned an unexpected error",
    );
  }

  target.setPhase("restored refresh tokens survive same-key Auth restart");
  for (const [index, value] of current.entries())
    current[index] = await refresh(value, index);
  target.setPhase("local logout revokes only its refresh session");
  for (const [index, value] of current.entries()) {
    const logout = await request(services.origin, "/logout?scope=local", {
      token: value.access,
      method: "POST",
    });
    same(logout, { status: 204, data: null }, "Local logout failed");
    same(
      exists(value, accounts[index]),
      "0",
      "Local logout retained its Auth session",
    );
    await denied(value.refresh);
    await denied(initial[index].data.refresh_token);
    // Neither a later login on this account nor the other account may be revoked.
    for (const [controlIndex, control] of independent.entries())
      independent[controlIndex] = await refresh(control, controlIndex);
    same(
      exists(value, accounts[index]),
      "0",
      "Rejected refresh recreated a logged-out session",
    );
    same(
      target.sql(database, query),
      targetBefore,
      "Refresh or logout changed application data",
    );
    same(
      source.sql(source.source, query),
      sourceBefore,
      "Target sessions changed source application data",
    );
  }
  console.log(
    "Restored refresh sessions passed: same-key restart, rotation, owner-isolated Data API, local logout rejection and independent-session controls. Access-token expiry and signing-key rotation remain separate checks.",
  );
}
