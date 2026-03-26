import { ModelDefinition } from "@/schema/model";
import { BelongsTo } from "../belongsToBuilder";
import { HasMany } from "../hasManyBuilder";
import { HasOne } from "../hasOneBuilder";
import { RelationViolation } from "./types";

/**
 * Pass 2 — HasMany / HasOne side.
 *
 * For every `hasMany` or `hasOne` that declares a `mappedBy`, the named
 * property on the target model must exist and must be a `belongsTo`.
 *
 * Violations collected:
 *   - `missing_belongsTo` — the `mappedBy` property doesn't exist on target.
 *   - `wrong_type`        — the property exists but is not a `belongsTo`.
 *   - `mappedBy_mismatch` — the `belongsTo` was found, has an *explicit*
 *                           `mappedBy` of its own, but it doesn't agree with
 *                           the property name on this model.
 */
export function checkInverse(
  model: ModelDefinition,
  modelMap: Map<string, ModelDefinition>,
): RelationViolation[] {
  const violations: RelationViolation[] = [];

  for (const [propName, propValue] of Object.entries(model._properties)) {
    if (!(propValue instanceof HasMany || propValue instanceof HasOne))
      continue;

    const mappedBy = propValue.getMappedBy();

    // No mappedBy declared — one-sided relation, nothing to validate.
    if (mappedBy === undefined) continue;

    const targetTable = propValue.getModuleTarget()._tableName;
    const targetModel = modelMap.get(targetTable);

    // Target not registered in this module — skip.
    if (!targetModel) continue;

    const inverseProp = targetModel._properties[mappedBy];
    const relationType = propValue instanceof HasMany ? "hasMany" : "hasOne";

    // ── missing_belongsTo ────────────────────────────────────────────────────
    if (inverseProp === undefined) {
      violations.push({
        kind: "missing_belongsTo",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: relationType,
        targetTable,
        targetProp: mappedBy,
        expectedType: "belongsTo",
      });
      continue;
    }

    // ── wrong_type ───────────────────────────────────────────────────────────
    if (!(inverseProp instanceof BelongsTo)) {
      violations.push({
        kind: "wrong_type",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: relationType,
        targetTable,
        targetProp: mappedBy,
        expectedType: "belongsTo",
        foundType:
          typeof inverseProp === "object" && inverseProp !== null
            ? ((inverseProp as any).constructor?.name ?? typeof inverseProp)
            : typeof inverseProp,
      });
      continue;
    }

    // ── mappedBy_mismatch ────────────────────────────────────────────────────
    // Only fire when the belongsTo has an *explicit* mappedBy that disagrees.
    // If the belongsTo has no explicit mappedBy, the hasMany's link is
    // authoritative and no conflict exists.
    if (
      inverseProp.hasExplicitMappedBy() &&
      inverseProp.getMappedBy() !== propName
    ) {
      violations.push({
        kind: "mappedBy_mismatch",
        sourceTable: model._tableName,
        sourceProp: propName,
        sourceType: relationType,
        targetTable,
        targetProp: mappedBy,
      });
    }
  }

  return violations;
}
