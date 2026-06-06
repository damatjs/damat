import type { RelationOptions, RelationSchema } from "@/types";
import { Relation } from "./base";
import { ModelTarget } from "@/utils/target";
import { toPascalCase } from "@/utils/stringConvertor";

// ─── HasOne ───────────────────────────────────────────────────────────────────

/**
 * HasOne — the inverse side of a one-to-one relationship.
 *
 * Does **not** create any DB artifacts (no column, no FK constraint).
 * The FK lives on the other side (the model with `BelongsTo` + `.unique()`).
 * This is pure ORM metadata used at module build time.
 *
 * ```ts
 * // User has one Profile — FK is on the profiles table (unique)
 * profile: hasOne(ProfileSchema, { mappedBy: "user" })
 *
 * // Without mappedBy — FK side is unlinked, no cross-validation
 * profile: hasOne(ProfileSchema)
 * ```
 */
export class HasOne extends Relation {
  /**
   * Property name on the **target** model that holds the `BelongsTo`
   * pointing back here.  When omitted, defaults to
   * `deriveNameFromTable(target._tableName)`.
   */
  private _mappedBy?: string;

  constructor(target: ModelTarget, options?: RelationOptions) {
    super("hasOne", target);
    if (options?.mappedBy !== undefined) {
      this._mappedBy = options.mappedBy;
    }
  }

  // ─── Fluent ───────────────────────────────────────────────────────────────

  /**
   * Set the inverse property name on the target model.
   *
   * ```ts
   * hasOne(ProfileSchema).mappedBy("user")
   * ```
   */
  mappedBy(propertyName: string): this {
    this._mappedBy = propertyName;
    return this;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  createsForeignKey(): boolean {
    return false;
  }

  getMappedBy(): string | undefined {
    return this._mappedBy;
  }

  // ─── Schema generation ────────────────────────────────────────────────────

  /**
   * Produce the `RelationSchema` for the module-level relationship map.
   *
   * @param fromTable The table name this relation is defined on.
   * @param fromProp  Property name this relation is registered under.
   */
  toRelationSchema(fromTable: string, fromProp: string): RelationSchema {
    const targetTable =
      typeof this.target === "string"
        ? this.target
        : this.getModuleTarget()._tableName;

    const schema: RelationSchema = {
      fromTable,
      from: fromProp,
      to: targetTable,
      type: "hasOne",
    };

    const mapped = this._mappedBy;
    if (mapped !== undefined) {
      schema.mappedBy = [mapped];
    }

    return schema;
  }

  toTsType(): any {
    if (typeof this.target === "string") {
      return toPascalCase(this.target);
    }
    return `${this.getModuleTarget().toTsType()}`;
  }
}

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Create a `HasOne` relation builder.
 *
 * ```ts
 * profile: hasOne(ProfileSchema)
 * profile: hasOne(ProfileSchema, { mappedBy: "user" })
 * profile: hasOne(ProfileSchema).mappedBy("user")
 * ```
 */
export function hasOne(target: ModelTarget, options?: RelationOptions): HasOne {
  return new HasOne(target, options);
}

// Backwards-compat alias
export { HasOne as HasOneBuilder };
