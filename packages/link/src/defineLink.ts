import type {
  LinkDefinition,
  LinkEndpoint,
  LinkOptions,
  ResolvedEndpoint,
} from "./types";
import { defaultPivotTable, pivotColumns } from "./naming";
import { buildPivotModel } from "./pivot";
import { snakeToCamel } from "./util";

function resolveEndpoint(endpoint: LinkEndpoint): ResolvedEndpoint {
  return {
    module: endpoint.module,
    model: endpoint.model,
    primaryKey: endpoint.primaryKey ?? "id",
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
 * ```ts
 * // src/links/user-organization.ts
 * export default defineLink(
 *   { module: "user", model: "user", field: "users" },
 *   { module: "organization", model: "organization", field: "organizations" },
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
  const { leftColumn, rightColumn } = pivotColumns(l, r);

  if (leftColumn === rightColumn) {
    throw new Error(
      `defineLink: both sides resolve to the junction column "${leftColumn}". ` +
        `Set a distinct \`field\` on one endpoint or pass \`options.pivotTable\`.`,
    );
  }

  const model = buildPivotModel({
    table: pivotTable,
    leftColumn,
    rightColumn,
    idPrefix: options.idPrefix ?? "link",
    options,
    ...(options.database?.foreignKeys
      ? { foreignKeys: { leftTarget: l.model, rightTarget: r.model } }
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
