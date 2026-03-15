import { ForeignKeySchema } from "../../types/foreignKey";
import { BelongsToOptions } from "../../types/foreignKey";
import { ColumnBuilder, TextColumnBuilder } from "../column";
import { RelationBuilder } from "./base";

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
