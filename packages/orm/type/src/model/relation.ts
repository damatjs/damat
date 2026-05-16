import {
  ForeignKeyAction,
  ForeignKeySchemaMatch,
  ForeignKeyType,
} from "./foreignKey";

// ─── Relation type tag ────────────────────────────────────────────────────────

export type RelationType = "belongsTo" | "hasMany" | "hasOne";

// ─── Constructor-level options ────────────────────────────────────────────────

/**
 * Options accepted by BelongsTo(Model, options) at construction time.
 *
 * `mappedBy` is the property name on the *owning* model that points back here.
 * When omitted the builder defaults to `<model._name>` (lowercased).
 */
export interface RelationOptions {
  mappedBy?: string;
}

// ─── .link() sub-builder payload ─────────────────────────────────────────────

/**
 * Describes the FK column(s) and the referenced column(s) on the target.
 * Passed to `.link({ foreignKey, reference })` on BelongsTo.
 */
export interface LinkConfig {
  /** The name of the FK column. */
  name?: string;

  /**
   * FK column name(s) on the **owning** (this) table.
   * Defaults to `<propertyName>_id` when not provided.
   */
  foreignKey?: string | string[] | ForeignKeyType | ForeignKeyType[];

  /**
   * Referenced column(s) on the **target** table.
   * Defaults to `["id"]` when not provided.
   */
  reference?: string | string[];
}

// ─── Constraint sub-builder payload ──────────────────────────────────────────

/**
 * Options accepted by the `.constraint(options)` method on BelongsTo.
 */
export interface ConstraintOptions {
  /** Explicit constraint name. Auto-generated when omitted. */
  name?: string;

  /** ON DELETE action */
  onDelete?: ForeignKeyAction;

  /** ON UPDATE action */
  onUpdate?: ForeignKeyAction;

  /** Make the constraint DEFERRABLE */
  deferrable?: boolean;

  /** When deferrable, start as INITIALLY DEFERRED */
  initiallyDeferred?: boolean;

  /** MATCH type for composite FK constraints */
  match?: ForeignKeySchemaMatch;
}

// ─── RelationSchema ───────────────────────────────────────────────────────────

/**
 * Serializable, snapshot-level description of a single relation.
 *
 * This is **not** the FK constraint record (that lives in `ForeignKeySchema`).
 * It is the module-level view used by the ORM to understand the graph of
 * relationships between models without inspecting the full table schemas.
 *
 * Produced by every relation class via `.toRelationSchema(fromProp)`.
 */
export interface RelationSchema {
  /** The property name on **this** model (e.g. `"orders"`, `"author"`). */
  from: string;

  /** The target table name. */
  to: string;

  /** The type of relation from this model's perspective. */
  type: RelationType;

  /**
   * For `hasMany` / `hasOne`: the property name(s) on the target model that
   * holds the corresponding `BelongsTo` back to this model.
   *
   * For `belongsTo`: the property name(s) on the target model that holds the
   * corresponding `hasMany` / `hasOne` back to this model.
   */
  mappedBy?: string[];

  /**
   * The FK column name(s) that physically links the two tables.
   * Only populated on `belongsTo` (where the FK lives on this table).
   */
  linkedBy?: string[];

  /** Referential-integrity rules carried from the FK constraint. */
  rule?: {
    onDelete?: ForeignKeyAction;
    onUpdate?: ForeignKeyAction;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    match?: ForeignKeySchemaMatch;
  };
}
