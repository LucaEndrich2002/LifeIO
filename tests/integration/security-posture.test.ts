import { beforeAll, describe, expect, test } from "vitest";
import { readSecurityCatalog } from "../supabase/security-catalog";

// Explicitly reviewed API surface. New tables, views, overloads and grants must
// receive a security decision rather than silently inheriting a passing check.
const tables = [
  "ai_request_limits",
  "budgets",
  "calendar_events",
  "entity_links",
  "expenses",
  "goal_contributions",
  "goal_milestones",
  "goal_rates",
  "goals",
  "incomes",
  "notifications",
  "onboarding",
  "profiles",
  "tasks",
  "weekly_reviews",
];
const invokerApi = [
  "is_supported_time_zone(text)",
  "read_calendar_events(timestamp with time zone, timestamp with time zone, integer)",
  "read_goal(uuid, integer)",
  "read_goal_milestones(uuid, integer)",
  "read_home_goals(text, integer)",
  "read_money_month(text, integer, integer)",
  "read_notifications(text, integer)",
  "read_tasks(text, text, text, integer)",
];
const definerApi = [
  "claim_ai_request()",
  "generate_weekly_review(text, integer)",
  "mutate_budget(text, uuid, integer, jsonb)",
  "mutate_calendar_event(text, uuid, integer, text, timestamp with time zone, timestamp with time zone, text)",
  "mutate_fixed_cost(text, uuid, uuid, integer, jsonb)",
  "mutate_goal(text, uuid, uuid, integer, jsonb)",
  "mutate_goal_budget_link(text, uuid, uuid, uuid)",
  "mutate_goal_milestone(text, uuid, uuid, integer, text)",
  "mutate_goal_plan_link(text, uuid, uuid, text, uuid)",
  "mutate_money(text, text, uuid, integer, jsonb)",
  "mutate_personal_goal(text, uuid, integer, text, text)",
  "mutate_task(text, uuid, integer, text, text, text)",
  "save_onboarding_step(text, jsonb, integer)",
  "set_notification_read(uuid, integer, boolean)",
  "synchronize_notifications()",
];
const internalDefiners = [
  "initialize_goal_rates()",
  "remove_plan_endpoint_links()",
  "remove_task_notifications()",
];
const internalInvokers = [
  "onboarding_amount(jsonb, boolean)",
  "set_profile_updated_at()",
];
const ownedExpressions = [
  "((selectauth.uid()asuid)=user_id)",
  "(user_id=(selectauth.uid()asuid))",
];
const visibleOwnedExpression =
  "((user_id=(selectauth.uid()asuid))and(removed_atisnull))";
const softDeleteTables = [
  "calendar_events",
  "entity_links",
  "goal_milestones",
  "tasks",
];
const normalize = (expression: string | null) =>
  expression?.replaceAll(/\s/g, "").toLowerCase();

describe("database access boundary across the complete application schema", () => {
  let catalog: ReturnType<typeof readSecurityCatalog>;
  beforeAll(() => {
    catalog = readSecurityCatalog();
  });

  test("API roles cannot bypass RLS, create objects or inherit another role", () => {
    expect(catalog.roles.map((role) => role.name)).toEqual([
      "anon",
      "authenticated",
    ]);
    for (const role of catalog.roles) {
      expect(role, role.name).toEqual({
        name: role.name,
        superuser: false,
        bypassRls: false,
        createRole: false,
        createDatabase: false,
        replication: false,
        createInPublic: false,
        memberOf: [],
      });
    }
  });

  test("every application relation is inventoried, owner-bound and RLS-enabled", () => {
    expect(catalog.relations.map((table) => table.name)).toEqual(tables);
    for (const table of catalog.relations) {
      expect(table, table.name).toMatchObject({
        kind: "r",
        owner: "postgres",
        rls: true,
        ownerColumnRequired: true,
      });
    }
  });

  test("anonymous access and direct writes are denied except reviewed profile columns", () => {
    for (const table of catalog.relations) {
      expect(
        table.access.map((access) => access.role),
        table.name,
      ).toEqual(["anon", "authenticated"]);
      for (const access of table.access) {
        const label = `${table.name}: ${access.role}`;
        expect(access.tablePrivileges, label).toEqual(
          access.role === "anon" ? [] : ["SELECT"],
        );
        if (access.role === "anon") {
          expect(access.columnPrivileges, label).toEqual([]);
          continue;
        }
        const writes = access.columnPrivileges.filter(
          (privilege) => !privilege.endsWith(":SELECT"),
        );
        expect(writes, label).toEqual(
          table.name === "profiles"
            ? [
                "currency:INSERT",
                "currency:UPDATE",
                "display_name:INSERT",
                "display_name:UPDATE",
                "time_zone:INSERT",
                "time_zone:UPDATE",
                "user_id:INSERT",
                "user_id:UPDATE",
              ]
            : [],
        );
      }
    }
  });

  test("all policies restrict rows to the current owner without permissive alternatives", () => {
    for (const table of catalog.relations) {
      expect(
        table.policies.map((policy) => policy.command).sort(),
        table.name,
      ).toEqual(table.name === "profiles" ? ["a", "r", "w"] : ["r"]);
      for (const policy of table.policies) {
        const label = `${table.name}: ${policy.name}`;
        expect(policy.roles, label).toEqual(["authenticated"]);
        expect(policy.permissive, label).toBe(true);
        if (policy.command === "a") expect(policy.using, label).toBeNull();
        else {
          const allowed = softDeleteTables.includes(table.name)
            ? [visibleOwnedExpression]
            : ownedExpressions;
          expect(allowed, label).toContain(normalize(policy.using));
        }
        if (policy.command === "r") expect(policy.check, label).toBeNull();
        else expect(ownedExpressions, label).toContain(normalize(policy.check));
      }
    }
  });

  test("only reviewed RPCs are executable and privileged functions pin their search path", () => {
    expect(catalog.functions.map((fn) => fn.signature).sort()).toEqual(
      [
        ...invokerApi,
        ...definerApi,
        ...internalDefiners,
        ...internalInvokers,
      ].sort(),
    );
    for (const fn of catalog.functions) {
      const exposed =
        invokerApi.includes(fn.signature) || definerApi.includes(fn.signature);
      expect(fn, fn.signature).toMatchObject({
        owner: "postgres",
        kind: "f",
        anonymousExecute: false,
        authenticatedExecute: exposed,
        authenticatedGrant: false,
        definer:
          definerApi.includes(fn.signature) ||
          internalDefiners.includes(fn.signature),
        configuration: ['search_path=""'],
      });
      if (fn.result === "trigger") expect(exposed, fn.signature).toBe(false);
    }
  });
});
