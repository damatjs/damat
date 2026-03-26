import type {
  ForeignKeySchema,
  ForeignKeyAction,
  ForeignKeySchemaMatch,
  ForeignKeyType,
  ColumnSchema,
} from "@/types";
import type {
  LinkConfig,
  ConstraintOptions,
  RelationSchema,
  RelationOptions,
} from "@/types/relation";
import {
  ColumnBuilder,
  TextColumnBuilder,
  UuidColumnBuilder,
  IntegerColumnBuilder,
} from "../column";
import { Relation } from "./base";
import { ModelTarget, removeLastS } from "@/utils/target";

// ─── BelongsTo ────────────────────────────────────────────────────────────────

/**
 * BelongsTo — the owning side of a relationship.
 *
 * Creates a FK column on this table pointing to the target table.
 *
 * ```ts
 * // Minimal
 * author: BelongsTo(UserSchema)
 *
 * // With options
 * author: BelongsTo(UserSchema, { mappedBy: "posts" })
 *           .link({ foreignKey: "author_id", reference: "id" })
 *           .onDelete("CASCADE")
 *           .indexed()
 *
 * // Composite FK
 * product: BelongsTo(ProductSchema)
 *            .link({ foreignKey: ["vendor_id", "sku"], reference: ["vendor_id", "sku"] })
 *
 * // Nullable 1:1
 * profile: BelongsTo(ProfileSchema)
 *            .nullable()
 *            .unique()
 * ```
 */
export class BelongsTo extends Relation {
  // ── Link config ─────────────────────────────────────────────────────────────

  /** Explicit FK column name(s). Defaults to `<propertyName>_id`. */
  private _foreignKey: ForeignKeyType[] = [];

  /** Referenced columns on the target table. Defaults to `["id"]`. */
  private _reference: string[] = ["id"];

  // ── Column modifiers ────────────────────────────────────────────────────────

  private _nullable = false;
  private _unique = false;
  private _indexed = false;

  // ── Constraint config ───────────────────────────────────────────────────────

  private _constraintName?: string;
  private _onDelete?: ForeignKeyAction;
  private _onUpdate?: ForeignKeyAction;
  private _deferrable = false;
  private _initiallyDeferred = false;
  private _match?: ForeignKeySchemaMatch;

  // ── Relation metadata ───────────────────────────────────────────────────────

  /**
   * The property name on the **target** model that holds the inverse
   * `hasMany` / `hasOne`.  Defaults to `deriveNameFromTable(target._tableName)`
   * (e.g. `"users"` → `"user"`).
   */
  private _mappedBy?: string;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor(target: ModelTarget, options?: RelationOptions) {
    super("belongsTo", target);
    if (options?.mappedBy !== undefined) {
      this._mappedBy = options.mappedBy;
    }
  }

  // ─── Fluent: link ─────────────────────────────────────────────────────────

  /**
   * Configure the FK column(s) and the referenced column(s) on the target.
   *
   * ```ts
   * .link({ foreignKey: "author_id", reference: "id" })
   * .link({ foreignKey: ["vendor_id", "sku"], reference: ["vendor_id", "sku"] })
   * ```
   */
  link(config: LinkConfig): this {
    if (config.foreignKey === undefined) {
      config.foreignKey = [`${this.getModuleTarget()._tableName}_id`];
    }
    if (config.reference === undefined) {
      config.reference = ["id"];
    }
    const foreignKey = Array.isArray(config.foreignKey)
      ? config.foreignKey
      : [config.foreignKey];

    const reference = Array.isArray(config.reference)
      ? config.reference
      : [config.reference];

    if (foreignKey.length !== reference.length)
      throw new Error("Foreign key and reference must have the same length");

    this._foreignKey = foreignKey.map((fk) => {
      if (typeof fk === "string") {
        return { name: fk, type: "text" };
      }
      return fk;
    });
    this._reference = reference;

    if (config.name) this._constraintName = config.name;

    return this;
  }

  // ─── Fluent: column modifiers ─────────────────────────────────────────────

  /** Mark the FK column as nullable (also defaults ON DELETE to SET NULL). */
  nullable(): this {
    this._nullable = true;
    return this;
  }

  /** Add UNIQUE on the FK column — turns this into a 1:1 relation. */
  unique(): this {
    this._unique = true;
    return this;
  }

  /** Create a btree index on the FK column. */
  indexed(): this {
    this._indexed = true;
    return this;
  }

  // ─── Fluent: constraint ───────────────────────────────────────────────────

  /**
   * Set FK constraint options in one call.
   *
   * ```ts
   * .constraint({ name: "fk_posts_users", onDelete: "CASCADE" })
   * ```
   */
  constraint(options: ConstraintOptions): this {
    if (options.name !== undefined) this._constraintName = options.name;
    if (options.onDelete !== undefined) this._onDelete = options.onDelete;
    if (options.onUpdate !== undefined) this._onUpdate = options.onUpdate;
    if (options.deferrable !== undefined) this._deferrable = options.deferrable;
    if (options.initiallyDeferred !== undefined)
      this._initiallyDeferred = options.initiallyDeferred;
    if (options.match !== undefined) this._match = options.match;
    return this;
  }

  /** Set the ON DELETE referential action. */
  onDelete(action: ForeignKeyAction): this {
    this._onDelete = action;
    return this;
  }

  /** Set the ON UPDATE referential action. */
  onUpdate(action: ForeignKeyAction): this {
    this._onUpdate = action;
    return this;
  }

  /** Set the MATCH */
  match(action: ForeignKeySchemaMatch): this {
    this._match = action;
    return this;
  }

  /** Make the FK constraint DEFERRABLE (optionally INITIALLY DEFERRED). */
  deferrable(initially = false): this {
    this._deferrable = true;
    this._initiallyDeferred = initially;
    return this;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  createsForeignKey(): boolean {
    return true;
  }

  /**
   * Resolved FK column name(s).
   * Falls back to `<propertyName>_id` when a property name has been set,
   * otherwise falls back to `<targetTable>_id`.
   */
  getForeignKey(): ForeignKeyType[] {
    if (!this._foreignKey || this._foreignKey.length === 0) {
      this._foreignKey = [
        {
          name: `${this.getModuleTarget()._tableName}_id`,
          type: "text",
        },
      ];
    }
    return this._foreignKey;
  }

  getConstrainName(): string {
    if (!this._constraintName) {
      const fk = this.getForeignKey();
      this._constraintName = `${this.getModuleTarget()._tableName}_${fk.map((fk) => fk.name).join("_")}_fk`;
    }
    return this._constraintName;
  }

  getReference(): string[] {
    if (!this._reference || this._reference.length === 0) {
      this._reference = ["id"];
    }
    return this._reference;
  }

  isNullable(): boolean {
    return this._nullable;
  }
  isUnique(): boolean {
    return this._unique;
  }
  isIndexed(): boolean {
    return this._indexed;
  }

  /**
   * The resolved `mappedBy` value — the property name on the target model
   * that points back to this side.
   * Falls back to `deriveNameFromTable(target._tableName)`.
   */
  getMappedBy(): string {
    return this._mappedBy ?? removeLastS(this.getModuleTarget()._tableName);
  }

  /** Returns `true` only when `mappedBy` was explicitly provided. */
  hasExplicitMappedBy(): boolean {
    return this._mappedBy !== undefined;
  }

  // ─── Schema generation ────────────────────────────────────────────────────

  /**
   * Produce the `ForeignKeySchema` for the table-level snapshot.
   *
   * @param sourceTable  Name of the table this relation lives on (used for
   *                     auto-generating the constraint name).
   */
  toForeignKeySchema(): ForeignKeySchema {
    const foreignKey = this.getForeignKey();
    const name = this.getConstrainName();
    const reference = this.getReference();

    const fk: ForeignKeySchema = {
      name: name,
      columns: foreignKey,
      referencedTable: this.getModuleTarget()._tableName,
      referencedColumns: reference,
    };

    if (this._onDelete) fk.onDelete = this._onDelete;
    else if (this._nullable) fk.onDelete = "SET NULL";

    if (this._onUpdate) fk.onUpdate = this._onUpdate;
    if (this._deferrable) fk.deferrable = this._deferrable;
    if (this._deferrable && this._initiallyDeferred)
      fk.initiallyDeferred = this._initiallyDeferred;
    if (this._match) fk.match = this._match;

    if (this._nullable) fk.nullable = this._nullable;
    if (this._unique) fk.unique = this._unique;
    if (this._indexed) fk.indexed = this._indexed;

    return fk;
  }

  /**
   * Build a `ColumnBuilder` for the FK column.
   * The column name is set externally by `ModelDefinition` via `_setName`.
   */
  toColumnBuilder(): ColumnBuilder[] {
    let cols: ColumnBuilder[] = [];
    this.getForeignKey().forEach((fk) => {
      let value: ColumnBuilder;
      switch (fk.type) {
        case "uuid":
          value = new UuidColumnBuilder();
          break;
        case "integer":
        case "smallint":
        case "bigint":
          value = new IntegerColumnBuilder();
          break;
        default:
          value = new TextColumnBuilder();
      }
      if (this._nullable) value.nullable();
      if (this._unique) value.unique();
      value._setName(fk.name);
      cols.push(value);
    });

    return cols;
  }
  /**
   * Build a `ColumnBuilder` for the FK column.
   * The column name is set externally by `ModelDefinition` via `_setName`.
   */
  toColumnSchema(): ColumnSchema[] {
    const cols = this.toColumnBuilder().map((columnBuilder) => {
      return columnBuilder.toSchema();
    });

    return cols;
  }

  /**
   * Produce the `RelationSchema` for the module-level relationship map.
   *
   * `linkedBy` = FK column name(s) (lives on this table).
   * `mappedBy` = inverse property name on the target model.
   *
   * @param fromProp  Property name this relation is registered under.
   */
  toRelationSchema(fromProp: string): RelationSchema {
    const schema: RelationSchema = {
      from: fromProp,
      to: this.getModuleTarget()._tableName,
      type: "belongsTo",
      mappedBy: [this.getMappedBy()],
      linkedBy: this.getForeignKey().map((fk) => fk.name),
    };

    const hasRule =
      this._onDelete !== undefined ||
      this._onUpdate !== undefined ||
      this._deferrable ||
      this._initiallyDeferred ||
      this._match !== undefined;

    if (hasRule) {
      schema.rule = {};
      if (this._onDelete) schema.rule.onDelete = this._onDelete;
      if (this._onUpdate) schema.rule.onUpdate = this._onUpdate;
      if (this._deferrable) schema.rule.deferrable = true;
      if (this._initiallyDeferred) schema.rule.initiallyDeferred = true;
      if (this._match) schema.rule.match = this._match;
    }

    return schema;
  }

  toTsType(): any {
    return `${this.getModuleTarget().toTsType()}`;
  }
}

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Create a `BelongsTo` relation builder.
 *
 * ```ts
 * author: belongsTo(UserSchema)
 * author: belongsTo(UserSchema, { mappedBy: "posts" })
 *           .link({ foreignKey: "author_id" })
 *           .onDelete("CASCADE")
 *           .indexed()
 * ```
 */
export function belongsTo(
  target: ModelTarget,
  options?: RelationOptions,
): BelongsTo {
  return new BelongsTo(target, options);
}

// Backwards-compat alias (used by schema/model.ts instanceof checks)
export { BelongsTo as BelongsToBuilder };
