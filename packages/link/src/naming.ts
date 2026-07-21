import { removeLastS } from "@damatjs/orm-model";
import type { ResolvedEndpoint } from "./types";
import { clampIdentifier } from "./util";

/** The slice of an endpoint the naming rules read. */
type NamedEndpoint = Pick<ResolvedEndpoint, "module" | "table">;

/**
 * Two-letter endings that mark a word as ALREADY singular even though it ends
 * in "s", so blindly stripping the trailing "s" would mangle it:
 *   - "ss": address -> "addres", class -> "clas", process -> "proces"
 *   - "us": status -> "statu", virus/campus/census/bonus (Latin singulars)
 *   - "is": analysis -> "analysi", basis, thesis, axis (Greek/Latin singulars)
 * Real plural table names in the Damat convention end in a consonant + "s"
 * OUTSIDE this set (users -> "rs", organizations -> "ns", orders/members ->
 * "rs"), so true plurals still singularize exactly as before. This is a
 * deliberately CONSERVATIVE guard, NOT full English singularization — the
 * `pivotTable` / `pivotColumns` overrides remain the escape hatch for the rare
 * word it still gets wrong (e.g. the true plurals "skis" / "menus").
 */
const SINGULAR_S_SUFFIXES = ["ss", "us", "is"] as const;

/**
 * The logical (singular) name of an endpoint — derived from its REAL table
 * name by stripping a trailing "s" (the same rule the ORM uses for `mappedBy`
 * defaults), so the `users` table contributes `user` and `care_plans`
 * contributes `care_plan`. Words already singular but ending in "s" (see
 * {@link SINGULAR_S_SUFFIXES}) and convention-named singular tables pass
 * through unchanged.
 */
function logicalName(endpoint: NamedEndpoint): string {
  const table = endpoint.table;
  if (SINGULAR_S_SUFFIXES.some((suffix) => table.endsWith(suffix)))
    return table;
  return removeLastS(table);
}

/**
 * A junction-table name segment for one endpoint. When the module id and the
 * table's logical name are the same (the common case, e.g. the `user` module's
 * `users` table) the segment collapses to a single token so the table reads
 * `user_organization` rather than `user_user_organization_organization`.
 * Otherwise both are kept so two modules that share a table never collide.
 */
function segment(endpoint: NamedEndpoint): string {
  const logical = logicalName(endpoint);
  return endpoint.module === logical
    ? endpoint.module
    : `${endpoint.module}_${logical}`;
}

/** Default junction table name for a pair of endpoints (clamped to 63 bytes). */
export function defaultPivotTable(
  left: NamedEndpoint,
  right: NamedEndpoint,
): string {
  return clampIdentifier(`${segment(left)}_${segment(right)}`);
}

/**
 * Junction column names for both sides. Defaults to `${logicalName}_id`
 * (`users` -> `user_id`); if both sides resolve to the same column name (two
 * same-named tables from different modules) each is qualified with its module
 * id to disambiguate.
 */
export function pivotColumns(
  left: NamedEndpoint,
  right: NamedEndpoint,
): { leftColumn: string; rightColumn: string } {
  let leftColumn = `${logicalName(left)}_id`;
  let rightColumn = `${logicalName(right)}_id`;
  if (leftColumn === rightColumn) {
    leftColumn = `${left.module}_${logicalName(left)}_id`;
    rightColumn = `${right.module}_${logicalName(right)}_id`;
  }
  return { leftColumn, rightColumn };
}
