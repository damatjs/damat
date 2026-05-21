import type { RelationOptions, RelationSchema } from "@/types";
import { Relation } from "./base";
import { ModelTarget } from '@/utils/target';

// ─── HasMany ──────────────────────────────────────────────────────────────────

/**
 * HasMany — the inverse side of a one-to-many relationship.
 *
 * Does **not** create any DB artifacts (no column, no FK constraint).
 * The FK lives on the "many" side (the model with the matching `BelongsTo`).
 * This is pure ORM metadata used at module build time.
 *
 * ```ts
 * // User has many Posts — FK is on the posts table
 * posts: hasMany(PostSchema, { mappedBy: "author" })
 *
 * // Without mappedBy — FK side is unlinked, no cross-validation
 * posts: hasMany(PostSchema)
 * ```
 */
export class HasMany extends Relation {
  /**
   * Property name on the **target** model that holds the `BelongsTo`
   * pointing back here.  When omitted, defaults to
   * `deriveNameFromTable(target._tableName)`.
   */
  private _mappedBy?: string;

  constructor(target: ModelTarget, options?: RelationOptions) {
    super("hasMany", target);
    if (options?.mappedBy !== undefined) {
      this._mappedBy = options.mappedBy;
    }
  }

  // ─── Fluent ───────────────────────────────────────────────────────────────

  /**
   * Set the inverse property name on the target model.
   *
   * ```ts
   * hasMany(PostSchema).mappedBy("author")
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
   * @param fromProp  Property name this relation is registered under.
   */
  toRelationSchema(fromProp: string): RelationSchema {
    const schema: RelationSchema = {
      from: fromProp,
      to: this.getModuleTarget()._tableName,
      type: "hasMany",
    };

    const mapped = this._mappedBy;
    if (mapped !== undefined) {
      schema.mappedBy = [mapped];
    }

    return schema;
  }
  toTsType(): any {
    return `Array<${this.getModuleTarget().toTsType()}>`;
  }
}

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Create a `HasMany` relation builder.
 *
 * ```ts
 * posts: hasMany(PostSchema)
 * posts: hasMany(PostSchema, { mappedBy: "author" })
 * posts: hasMany(PostSchema).mappedBy("author")
 * ```
 */
export function hasMany(target: ModelTarget, options?: RelationOptions): HasMany {
  return new HasMany(target, options);
}

// Backwards-compat alias
export { HasMany as HasManyBuilder };
