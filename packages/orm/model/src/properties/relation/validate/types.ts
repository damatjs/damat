// ─── Violation kinds ──────────────────────────────────────────────────────────

/**
 * Every distinct way a relation pair can be broken.
 *
 * `missing_inverse`   — a `belongsTo` has no `hasMany`/`hasOne` on the target.
 * `missing_belongsTo` — a `hasMany`/`hasOne` mappedBy points to a property
 *                       that doesn't exist on the target.
 * `wrong_type`        — the back-reference property exists but is the wrong
 *                       relation kind (e.g. a plain column instead of belongsTo).
 * `mappedBy_mismatch` — both sides exist but their `mappedBy` values don't
 *                       agree with each other.
 */
export type ViolationKind =
  | "missing_inverse"
  | "missing_belongsTo"
  | "wrong_type"
  | "mappedBy_mismatch";

// ─── RelationViolation ────────────────────────────────────────────────────────

/**
 * A single broken-relation diagnostic.
 *
 * Carries enough context for `formatViolations` to produce a message that
 * tells the user exactly what is wrong and what they should add/fix.
 */
export interface RelationViolation {
  kind: ViolationKind;

  /** Table where the problem was detected. */
  sourceTable: string;

  /** Property name on `sourceTable` that has the broken relation. */
  sourceProp: string;

  /** The relation type on `sourceTable` (`"belongsTo"` | `"hasMany"` | `"hasOne"`). */
  sourceType: "belongsTo" | "hasMany" | "hasOne";

  /** The table that is the target of the relation. */
  targetTable: string;

  /**
   * The property name that was expected (or found to be wrong) on `targetTable`.
   * Populated for all violation kinds.
   */
  targetProp: string;

  /**
   * The relation type that was expected on `targetTable`.
   * e.g. for a `belongsTo` the expected inverse is `"hasMany"` or `"hasOne"`.
   */
  expectedType?: "belongsTo" | "hasMany" | "hasOne";

  /**
   * For `wrong_type`: the relation type that was actually found on `targetTable`.
   */
  foundType?: string;
}

// ─── ValidationResult ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  violations: RelationViolation[];
}
