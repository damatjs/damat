import {
  ForeignKeySchema,
  ForeignKeyAction,
} from "../../types/properties/foreignKey";
import { ColumnBuilder, TextColumnBuilder } from "./base";

/**
 * Relation type enumeration
 */
export type RelationType = "belongsTo" | "hasMany" | "hasOne";

/**
 * Options for belongsTo relation
 */
export interface BelongsToOptions {
  /** The foreign key column name */
  foreignKey?: string;
  /** The property name on the related model that maps back */
  mappedBy?: string;
}

/**
 * Options for hasMany/hasOne relation
 */
export interface HasManyOptions {
  /** The property name on the related model that maps back */
  mappedBy: string;
}

/**
 * Relation definition stored in model
 */
export interface RelationDefinition {
  type: RelationType;
  /** Function that returns the related model name (for lazy evaluation) */
  target: () => string;
  /** Foreign key column name (for belongsTo) */
  foreignKey?: string;
  /** Mapped by property name */
  mappedBy?: string;
  /** Whether the relation is nullable */
  nullable: boolean;
  /** On delete action */
  onDelete?: ForeignKeyAction;
  /** On update action */
  onUpdate?: ForeignKeyAction;
}

/**
 * Base relation builder
 */
abstract class RelationBuilder {
  protected _type: RelationType;
  protected _target: () => string;
  protected _foreignKey?: string;
  protected _mappedBy?: string;
  protected _nullable: boolean = false;
  protected _onDelete?: ForeignKeyAction;
  protected _onUpdate?: ForeignKeyAction;

  constructor(type: RelationType, target: () => string) {
    this._type = type;
    this._target = target;
  }

  /** Mark relation as nullable */
  nullable(): this {
    this._nullable = true;
    return this;
  }

  /** Set on delete action */
  onDelete(action: ForeignKeyAction): this {
    this._onDelete = action;
    return this;
  }

  /** Set on update action */
  onUpdate(action: ForeignKeyAction): this {
    this._onUpdate = action;
    return this;
  }

  /** Get relation definition */
  toDefinition(): RelationDefinition {
    const def: RelationDefinition = {
      type: this._type,
      target: this._target,
      nullable: this._nullable,
    };

    if (this._foreignKey !== undefined) {
      def.foreignKey = this._foreignKey;
    }
    if (this._mappedBy !== undefined) {
      def.mappedBy = this._mappedBy;
    }
    if (this._onDelete !== undefined) {
      def.onDelete = this._onDelete;
    }
    if (this._onUpdate !== undefined) {
      def.onUpdate = this._onUpdate;
    }

    return def;
  }

  /** Check if this relation creates a foreign key column */
  abstract createsForeignKey(): boolean;

  /** Get the foreign key column name if this relation creates one */
  abstract getForeignKeyColumn(): string | undefined;
}

/**
 * BelongsTo relation builder - creates a foreign key column
 */
export class BelongsToBuilder extends RelationBuilder {
  constructor(target: () => string, options?: BelongsToOptions) {
    super("belongsTo", target);
    if (options?.foreignKey !== undefined) {
      this._foreignKey = options.foreignKey;
    }
    if (options?.mappedBy !== undefined) {
      this._mappedBy = options.mappedBy;
    }
    // Default onDelete for belongsTo
    this._onDelete = "SET NULL";
  }

  createsForeignKey(): boolean {
    return true;
  }

  getForeignKeyColumn(): string {
    // Default to target_id if not specified
    return this._foreignKey ?? `${this._target()}_id`;
  }

  /** Generate the foreign key column builder */
  toColumnBuilder(): ColumnBuilder {
    const column = new TextColumnBuilder();
    if (this._nullable) {
      column.nullable();
    }
    return column;
  }

  /** Generate the foreign key schema */
  toForeignKeySchema(
    tableName: string,
    columnName: string,
    targetTable: string,
  ): ForeignKeySchema {
    const schema: ForeignKeySchema = {
      name: `fk_${tableName}_${columnName}`,
      columns: [columnName],
      referencedTable: targetTable,
      referencedColumns: ["id"],
      unique: false, // belongsTo is many-to-one
    };

    if (this._onDelete !== undefined) {
      schema.onDelete = this._onDelete;
    }
    if (this._onUpdate !== undefined) {
      schema.onUpdate = this._onUpdate;
    }

    return schema;
  }
}

/**
 * HasMany relation builder - does not create a foreign key column
 */
export class HasManyBuilder extends RelationBuilder {
  constructor(target: () => string, options: HasManyOptions) {
    super("hasMany", target);
    this._mappedBy = options.mappedBy;
  }

  createsForeignKey(): boolean {
    return false;
  }

  getForeignKeyColumn(): undefined {
    return undefined;
  }
}

/**
 * HasOne relation builder - does not create a foreign key column
 */
export class HasOneBuilder extends RelationBuilder {
  constructor(target: () => string, options: HasManyOptions) {
    super("hasOne", target);
    this._mappedBy = options.mappedBy;
  }

  createsForeignKey(): boolean {
    return false;
  }

  getForeignKeyColumn(): undefined {
    return undefined;
  }
}

// Type for model reference - can be a model object with name or a function returning one
export type ModelReference =
  | { _tableName: string }
  | (() => { _tableName: string });

/**
 * Resolve model reference to table name
 */
export function resolveModelReference(ref: ModelReference): string {
  if (typeof ref === "function") {
    return ref()._tableName;
  }
  return ref._tableName;
}

/**
 * Create a lazy model reference function
 */
export function createLazyReference(ref: ModelReference): () => string {
  return () => resolveModelReference(ref);
}
