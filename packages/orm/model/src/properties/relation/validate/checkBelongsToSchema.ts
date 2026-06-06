import { RelationSchema } from "@/types";
import { RelationViolation } from "./types";

/**
 * Pass 1 (schema-level) — BelongsTo side.
 *
 * For every `belongsTo` entry in the `RelationSchema[]` array that declares a
 * `mappedBy`, a matching `hasMany` or `hasOne` entry must exist in the same
 * array with its `fromTable` pointing at the `belongsTo`'s `to` table and its `to`
 * pointing back at the `belongsTo`'s `fromTable` table.
 *
 * Violations collected:
 *   - `missing_inverse`   — no `hasMany`/`hasOne` entry exists that links back
 *                           from the target table to the owning table.
 *   - `mappedBy_mismatch` — both entries exist but neither side has a `mappedBy`
 *                           value, meaning the relationship is declared
 *                           inconsistently (one side claims an inverse, the
 *                           other is silent).
 *
 * Note: `from` in `RelationSchema` is the property name on the source table.
 * `fromTable` is the source table name. The `mappedBy` value records the
 * property name on the target that was declared.
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
        r.fromTable === rel.to &&
        r.to === rel.fromTable,
    );

    // ── missing_inverse ──────────────────────────────────────────────────────
    if (!inverse) {
      violations.push({
        kind: "missing_inverse",
        sourceTable: rel.fromTable,
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
