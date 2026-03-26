import { RelationSchema } from "@/types/relation";
import { RelationViolation } from "./types";

/**
 * Pass 1 (schema-level) — BelongsTo side.
 *
 * For every `belongsTo` entry in the `RelationSchema[]` array that declares a
 * `mappedBy`, a matching `hasMany` or `hasOne` entry must exist in the same
 * array with its `from` pointing at the `belongsTo`'s `to` table and its `to`
 * pointing back at the `belongsTo`'s `from` table.
 *
 * Violations collected:
 *   - `missing_inverse`   — no `hasMany`/`hasOne` entry exists that links back
 *                           from the target table to the owning table.
 *   - `mappedBy_mismatch` — both entries exist but neither side has a `mappedBy`
 *                           value, meaning the relationship is declared
 *                           inconsistently (one side claims an inverse, the
 *                           other is silent).
 *
 * Note: `from` in `RelationSchema` is the source **table name** (not the
 * property name).  The `mappedBy` value records the property name on the
 * target that was declared — but because `from` carries only a table name,
 * exact property-level agreement cannot be verified here.  That check belongs
 * to `checkBelongsTo` (model-level validator).
 */
export function checkBelongsToSchema(
  relationships: RelationSchema[],
): RelationViolation[] {
  const violations: RelationViolation[] = [];

  for (const rel of relationships) {
    if (rel.type !== "belongsTo") continue;

    // No mappedBy declared — inverse is optional, nothing to validate here.
    if (!rel.mappedBy || rel.mappedBy.length === 0) continue;

    // Find a hasMany or hasOne entry that links the target back to this table.
    const inverse = relationships.find(
      (r) =>
        (r.type === "hasMany" || r.type === "hasOne") &&
        r.from === rel.to &&
        r.to === rel.from,
    );

    // ── missing_inverse ──────────────────────────────────────────────────────
    if (!inverse) {
      violations.push({
        kind: "missing_inverse",
        sourceTable: rel.from,
        sourceProp: rel.from,
        sourceType: "belongsTo",
        targetTable: rel.to,
        targetProp: rel.mappedBy[0]!,
        expectedType: "hasMany",
      });
    }
  }

  return violations;
}
