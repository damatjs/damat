import type { ResolvedEndpoint } from "./types";
import { clampIdentifier } from "./util";

/**
 * A junction-table name segment for one endpoint. When the module id and model
 * key are the same (the common case, e.g. the `user` module's `user` model) the
 * segment collapses to a single token so the table reads `user_organization`
 * rather than `user_user_organization_organization`. Otherwise both are kept so
 * two modules that share a model name never collide.
 */
function segment(endpoint: ResolvedEndpoint): string {
  return endpoint.module === endpoint.model
    ? endpoint.module
    : `${endpoint.module}_${endpoint.model}`;
}

/** Default junction table name for a pair of endpoints (clamped to 63 bytes). */
export function defaultPivotTable(
  left: ResolvedEndpoint,
  right: ResolvedEndpoint,
): string {
  return clampIdentifier(`${segment(left)}_${segment(right)}`);
}

/**
 * Junction column names for both sides. Defaults to `${model}_id`; if both sides
 * resolve to the same column name (two same-named models from different modules)
 * each is qualified with its module id to disambiguate.
 */
export function pivotColumns(
  left: ResolvedEndpoint,
  right: ResolvedEndpoint,
): { leftColumn: string; rightColumn: string } {
  let leftColumn = `${left.model}_id`;
  let rightColumn = `${right.model}_id`;
  if (leftColumn === rightColumn) {
    leftColumn = `${left.module}_${left.model}_id`;
    rightColumn = `${right.module}_${right.model}_id`;
  }
  return { leftColumn, rightColumn };
}
