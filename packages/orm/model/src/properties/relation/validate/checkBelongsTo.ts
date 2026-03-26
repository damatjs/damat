import { ModelDefinition } from "@/schema/model";
import { BelongsTo } from "../belongsToBuilder";
import { HasMany } from "../hasManyBuilder";
import { HasOne } from "../hasOneBuilder";
import { RelationViolation } from "./types";

/**
 * Pass 1 — BelongsTo side.
 *
 * Only runs when the `belongsTo` has an **explicit** `mappedBy` — meaning the
 * author deliberately declared which property on the target points back here.
 * When `mappedBy` is auto-derived (the default), the inverse is optional and
 * is validated from the other direction by `checkInverse` instead.
 *
 * Violations collected:
 *   - `missing_inverse`   — the declared `mappedBy` property doesn't exist on
 *                           the target.
 *   - `wrong_type`        — the property exists but is not hasMany / hasOne.
 *   - `mappedBy_mismatch` — the inverse hasMany/hasOne has its own explicit
 *                           `mappedBy` but it doesn't point back at the right
 *                           property name on this model.
 */
export function checkBelongsTo(
  model: ModelDefinition,
  modelMap: Map<string, ModelDefinition>,
): RelationViolation[] {
  const violations: RelationViolation[] = [];

  for (const [propName, propValue] of Object.entries(model._properties)) {
    if (!(propValue instanceof BelongsTo)) continue;

    // Only validate when mappedBy was explicitly declared.
    if (!propValue.hasExplicitMappedBy()) continue;

    const targetTable = propValue.getModuleTarget()._tableName;
    const targetModel = modelMap.get(targetTable);

    // Target not registered in this module — skip.
    if (!targetModel) continue;

    const expectedInverseProp = propValue.getMappedBy();
    const inverseProp = targetModel._properties[expectedInverseProp];

    // ── missing_inverse ──────────────────────────────────────────────────────
    if (inverseProp === undefined) {
      violations.push({
        kind: "missing_inverse",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: "belongsTo",
        targetTable,
        targetProp: expectedInverseProp,
        expectedType: "hasMany",
      });
      continue;
    }

    // ── wrong_type ───────────────────────────────────────────────────────────
    if (!(inverseProp instanceof HasMany || inverseProp instanceof HasOne)) {
      violations.push({
        kind: "wrong_type",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: "belongsTo",
        targetTable,
        targetProp: expectedInverseProp,
        expectedType: "hasMany",
        foundType:
          typeof inverseProp === "object" && inverseProp !== null
            ? ((inverseProp as any).constructor?.name ?? typeof inverseProp)
            : typeof inverseProp,
      });
      continue;
    }

    // ── mappedBy_mismatch ────────────────────────────────────────────────────
    // Only check if the inverse side also has an explicit mappedBy that
    // disagrees with this property name.
    const inverseMappedBy = inverseProp.getMappedBy();
    if (inverseMappedBy !== undefined && inverseMappedBy !== propName) {
      violations.push({
        kind: "mappedBy_mismatch",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: "belongsTo",
        targetTable,
        targetProp: expectedInverseProp,
      });
    }
  }

  return violations;
}
