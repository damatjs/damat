import { RelationSchema } from "@/types/relation";
import { RelationViolation } from "./types";

/**
 * Pass 2 (schema-level) — HasMany / HasOne side.
 *
 * For every `hasMany` or `hasOne` entry in the `RelationSchema[]` array that
 * declares a `mappedBy`, a matching `belongsTo` entry must exist in the same
 * array with its `from` pointing at the `hasMany`/`hasOne`'s `to` table and
 * its `to` pointing back at the `hasMany`/`hasOne`'s `from` table.
 *
 * Violations collected:
 *   - `missing_belongsTo` — no `belongsTo` entry exists that links back from
 *                           the target table to the owning table.
 *
 * Note: `from` in `RelationSchema` is the source **table name** (not the
 * property name).  The `mappedBy` value records the property name on the
 * target that was declared — but because `from` carries only a table name,
 * exact property-level agreement cannot be verified here.  That check belongs
 * to `checkInverse` (model-level validator).
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
      (r) => r.type === "belongsTo" && r.from === rel.to && r.to === rel.from,
    );

    // ── missing_belongsTo ────────────────────────────────────────────────────
    if (!inverse) {
      violations.push({
        kind: "missing_belongsTo",
        sourceTable: rel.from,
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
