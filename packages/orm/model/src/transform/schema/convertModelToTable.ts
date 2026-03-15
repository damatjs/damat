import {
  TableSchema,
  PrimaryKeySchema,
  ColumnSchema, IndexSchema,
  ForeignKeySchema,
  ModelDefinition,
  ModelProperties
} from "@/types";
import {
  ColumnBuilder,
  BelongsToBuilder,
  convertIndexDefinition
} from "../properties";

/**
 * Convert a model definition to TableSchema
 */
export function convertModelToTableSchema<T extends ModelProperties>(
  model: ModelDefinition<T>,
): TableSchema {
  const columns: ColumnSchema[] = [];
  const foreignKeys: ForeignKeySchema[] = [];
  const indexSchemas: IndexSchema[] = [];
  let primaryKeyColumns: string[] = [];
  let primaryKeyName = `${model._tableName}_pkey`;

  // Process each property
  for (const [propName, propValue] of Object.entries(model._properties)) {
    if (propValue instanceof ColumnBuilder) {
      // Set the column name
      propValue._setName(propName);
      const columnSchema = propValue.toSchema();
      columns.push(columnSchema);

      // Track primary key columns
      if (columnSchema.primaryKey) {
        primaryKeyColumns.push(propName);
      }
    } else if (propValue instanceof BelongsToBuilder) {
      // BelongsTo creates a foreign key column
      const fkColumnName = propValue.getForeignKeyColumn();
      const columnBuilder = propValue.toColumnBuilder();
      columnBuilder._setName(fkColumnName);
      columns.push(columnBuilder.toSchema());

      // Get the target table name
      const targetTableName = propValue.toDefinition().target();
      foreignKeys.push(
        propValue.toForeignKeySchema(
          model._tableName,
          fkColumnName,
          targetTableName,
        ),
      );
    }
    // HasMany and HasOne don't create columns - they're just metadata
  }

  // Convert index definitions to IndexSchema
  model._indexes.forEach((indexDef, idx) => {
    indexSchemas.push(convertIndexDefinition(model._tableName, indexDef, idx));
  });

  // Build primary key schema
  const primaryKey: PrimaryKeySchema = {
    name: primaryKeyName,
    columns: primaryKeyColumns,
  };

  // Build the table schema
  const tableSchema: TableSchema = {
    name: model._tableName,
    columns,
    indexes: indexSchemas,
    foreignKeys,
    primaryKey,
  };

  if (model._schemaName !== undefined) {
    tableSchema.schema = model._schemaName;
  }

  return tableSchema;
}
