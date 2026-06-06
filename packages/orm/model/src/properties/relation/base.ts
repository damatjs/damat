import { ModelDefinition } from "@/schema";
import type { RelationType, RelationSchema } from "@/types";
import { ModelTarget, resolveModuleTarget } from "@/utils/target";

// ─── Abstract Relation base ───────────────────────────────────────────────────

/**
 * Abstract base for all relation builders (BelongsTo, HasMany, HasOne).
 *
 * Carries only the cross-cutting concerns:
 * - Holding the target reference (direct or lazy).
 * - Tracking the property name assigned during `ModelDefinition.toTableSchema()`.
 * - Requiring subclasses to implement `createsForeignKey()` and
 *   `toRelationSchema(fromProp)`.
 *
 * There is deliberately **no generic parameter** here.
 * Relations are structural builders; full model-type propagation is the
 * concern of the higher-level model layer, not the relation classes themselves.
 */
export abstract class Relation {
  /** Discriminator tag matching `RelationType`. */
  readonly kind: RelationType;

  /** The target model (or lazy thunk for circular references). */
  protected target: ModelTarget;

  /**
   * The property name this relation is registered under on the owning model.
   * Set by `ModelDefinition` before schema generation via `_setPropertyName`.
   */
  protected _propertyName?: string;

  constructor(kind: RelationType, target: ModelTarget) {
    this.kind = kind;
    this.target = target;
  }

  // ─── ModelTarget helpers ─────────────────────────────────────────────────────────

  /** Return the resolved target model. */
  getModuleTarget(): ModelDefinition {
    return resolveModuleTarget(this.target);
  }

  /** Return the target's SQL table name. */
  getModuleTargetTable(): string {
    return this.getModuleTarget()._tableName;
  }

  // ─── Abstract contract ──────────────────────────────────────────────────────

  /**
   * `true` for BelongsTo (creates a FK column on this table).
   * `false` for HasMany / HasOne (no DB artifact on this side).
   */
  abstract createsForeignKey(): boolean;

  /**
   * Produce a `RelationSchema` for the module-level relationship map.
   *
   * @param fromTable The table name this relation is defined on.
   * @param fromProp  The property name this relation is registered under.
   */
  abstract toRelationSchema(
    fromTable: string,
    fromProp: string,
  ): RelationSchema;
}
