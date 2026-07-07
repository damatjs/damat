import { getRegisteredModel, type ModelDefinition } from "@damatjs/orm-model";
import type {
  LinkDefinition,
  LinkEndpoint,
  LinkOptions,
  ResolvedEndpoint,
} from "./types";
import { defaultPivotTable, pivotColumns } from "./naming";
import { buildPivotModel } from "./pivot";
import { camelToSnake, snakeToCamel } from "./util";

/**
 * The registered model behind an endpoint's model KEY, when its module is
 * already loaded. `collectModels` keys are the camelCased table name, so the
 * key itself (`users`) or its snake_case form (`carePlans` -> `care_plans`)
 * is the table the model registered under. Returns `undefined` when the model
 * has not been imported yet (e.g. `migrate:create link:<owner>` loads only the
 * links dir) — the string fallbacks below derive the same names either way.
 */
function registeredModelFor(key: string): ModelDefinition | undefined {
  return getRegisteredModel(key) ?? getRegisteredModel(camelToSnake(key));
}

/** A model's primary-key column name (defaults to `id`). */
function primaryKeyOf(model: ModelDefinition): string {
  const pk = model.toTableSchema().columns.find((c) => c.primaryKey);
  return pk?.name ?? "id";
}

function resolveEndpoint(endpoint: LinkEndpoint): ResolvedEndpoint {
  const registered = registeredModelFor(endpoint.model);
  return {
    module: endpoint.module,
    model: endpoint.model,
    table: registered?._tableName ?? camelToSnake(endpoint.model),
    primaryKey:
      endpoint.primaryKey ?? (registered ? primaryKeyOf(registered) : "id"),
    alias: endpoint.field ?? endpoint.model,
    isList: endpoint.isList ?? true,
  };
}

/**
 * Define a link between two models that live in different modules.
 *
 * A link is the bridge that lets modules stay isolated while still relating to
 * one another: it generates a junction table (migrated and typed by the normal
 * pipelines) and lets you create/dismiss/query the relationship across modules
 * without either module importing the other.
 *
 * Junction naming derives from each side's REAL table name (resolved through
 * the global model registry, or from the key by the `collectModels`
 * convention), singularized the way the ORM derives logical names — so the
 * `user` module's `users` table and the `organization` module's
 * `organizations` table produce `user_organization` (`user_id`,
 * `organization_id`). Override with `options.pivotTable` / `options.pivotColumns`.
 *
 * ```ts
 * // src/links/user/models/user-organization.ts
 * export default defineLink(
 *   { module: "user", model: "users", field: "users" },
 *   { module: "organization", model: "organizations", field: "organizations" },
 * );
 * ```
 */
export function defineLink(
  left: LinkEndpoint,
  right: LinkEndpoint,
  options: LinkOptions = {},
): LinkDefinition {
  const l = resolveEndpoint(left);
  const r = resolveEndpoint(right);

  const pivotTable = options.pivotTable ?? defaultPivotTable(l, r);
  const derived = pivotColumns(l, r);
  const leftColumn = options.pivotColumns?.left ?? derived.leftColumn;
  const rightColumn = options.pivotColumns?.right ?? derived.rightColumn;

  if (leftColumn === rightColumn) {
    throw new Error(
      `defineLink: both sides resolve to the junction column "${leftColumn}". ` +
        `Set distinct \`options.pivotColumns\` or a distinct \`field\` per endpoint.`,
    );
  }

  const model = buildPivotModel({
    table: pivotTable,
    leftColumn,
    rightColumn,
    idPrefix: options.idPrefix ?? "link",
    options,
    ...(options.database?.foreignKeys
      ? {
          foreignKeys: {
            left: { table: l.table, reference: l.primaryKey },
            right: { table: r.table, reference: r.primaryKey },
          },
        }
      : {}),
  });

  return {
    left: l,
    right: r,
    pivotTable,
    pivotName: snakeToCamel(pivotTable),
    leftColumn,
    rightColumn,
    model,
    options,
  };
}
