import { BelongsToOptions, ForeignKeySchema, ModelProperties } from "@/types";
import { ColumnBuilder, TextColumnBuilder } from "../column";
import { RelationBuilder } from "./base";

/**
 * BelongsToBuilder relation builder - creates a foreign key column.
 *
 * The type parameter `T` carries the target model's property map so that
 * `ModelDefinition._properties.someRelation` is typed as
 * `BelongsToBuilder<TargetModel['_properties']>` rather than the erased
 * `BelongsToBuilder<ModelProperties>`.
 *
 * The FK column name defaults to `<propertyName>_id` (e.g., `user` → `user_id`).
 * This can be overridden via the `foreignKey` option.
 */
export class BelongsToBuilder<
  T extends ModelProperties = ModelProperties,
> extends RelationBuilder {
  /** Phantom type — never accessed at runtime, only used for TS inference */
  declare readonly _targetProperties: T;

  /** The property name this relation is assigned to (set during schema conversion) */
  private _propertyName?: string;

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

  /** Set the property name (called during schema conversion) */
  _setPropertyName(name: string): void {
    this._propertyName = name;
  }

  /** Get the property name */
  getPropertyName(): string | undefined {
    return this._propertyName;
  }

  createsForeignKey(): boolean {
    return true;
  }

  /**
   * Get the foreign key column name.
   * Defaults to `<propertyName>_id` if not explicitly set via options.
   * Falls back to `<targetTableName>_id` if property name is not yet set.
   */
  getForeignKeyColumn(): string {
    if (this._foreignKey !== undefined) {
      return this._foreignKey;
    }
    // Use property name if available (e.g., user → user_id)
    if (this._propertyName !== undefined) {
      return `${this._propertyName}_id`;
    }
    // Fallback to target table name (shouldn't happen in normal flow)
    return `${this._target()}_id`;
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
