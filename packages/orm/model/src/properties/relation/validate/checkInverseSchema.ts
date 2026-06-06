import { RelationSchema } from "@/types";
import { RelationViolation } from "./types";

/**
 * Pass 2 (schema-level) — HasMany / HasOne side.
 *
 * For every `hasMany` or `hasOne` entry in the `RelationSchema[]` array that
 * declares a `mappedBy`, a matching `belongsTo` entry must exist in the same
 * array with its `fromTable` pointing at the `hasMany`/`hasOne`'s `to` table and
 * its `to` pointing back at the `hasMany`/`hasOne`'s `fromTable` table.
 *
 * Violations collected:
 *   - `missing_belongsTo` — no `belongsTo` entry exists that links back from
 *                           the target table to the owning table.
 *
 * Note: `from` in `RelationSchema` is the property name on the source table.
 * `fromTable` is the source table name. The `mappedBy` value records the
 * property name on the target that was declared.
 */
export function checkInverseSchema(
  relationships: RelationSchema[],
): RelationViolation[] {
  const violations: RelationViolation[] = [];

  for (const rel of relationships) {
    if (rel.type !== "hasMany" && rel.type !== "hasOne") continue;

    // No mappedBy declared — one-sided relation, nothing to validate.
    if (!rel.mappedBy || rel.mappedBy.length === 0) continue;

    // Find a belongsTo entry that links the target back to this table.
    const inverse = relationships.find(
      (r) =>
        r.type === "belongsTo" &&
        r.fromTable === rel.to &&
        r.to === rel.fromTable,
    );

    // ── missing_belongsTo ────────────────────────────────────────────────────
    if (!inverse) {
      violations.push({
        kind: "missing_belongsTo",
        sourceTable: rel.fromTable,
        sourceProp: rel.from,
        sourceType: rel.type,
        targetTable: rel.to,
        targetProp: rel.mappedBy[0]!,
        expectedType: "belongsTo",
      });
    }
  }

  return violations;
}
