import { TableSchema, PrimaryKeySchema } from "../../types/properties/table";
import { ColumnSchema } from "../../types/properties/column";
import { IndexSchema } from "../../types/properties/indexType";
import { ForeignKeySchema } from "../../types/properties/foreignKey";
import {
  ColumnBuilder,
  IdColumnBuilder,
  TextColumnBuilder,
  VarcharColumnBuilder,
  NumberColumnBuilder,
  DecimalColumnBuilder,
  BooleanColumnBuilder,
  TimestampColumnBuilder,
  DateColumnBuilder,
  TimeColumnBuilder,
  JsonColumnBuilder,
  EnumColumnBuilder,
  UuidColumnBuilder,
  ByteaColumnBuilder,
} from "../properties/base";
import { IndexDefinition, convertIndexDefinition } from "../properties/indexes";
import {
  BelongsToBuilder,
  HasManyBuilder,
  HasOneBuilder,
  BelongsToOptions,
  HasManyOptions,
  ModelReference,
  createLazyReference,
} from "../properties/foreignKeys";

/**
 * Property types that can be used in model definition
 */
export type PropertyValue =
  | ColumnBuilder
  | BelongsToBuilder
  | HasManyBuilder
  | HasOneBuilder;

/**
 * Model properties definition
 */
export type ModelProperties = Record<string, PropertyValue>;

/**
 * Model definition result
 */
export interface ModelDefinition<T extends ModelProperties = ModelProperties> {
  /** Internal table name */
  _tableName: string;
  /** Internal schema name */
  _schemaName?: string;
  /** Internal properties */
  _properties: T;
  /** Internal indexes */
  _indexes: IndexDefinition[];
  /** Add indexes to the model */
  indexes(indexes: IndexDefinition[]): ModelDefinition<T>;
  /** Convert to TableSchema */
  toTableSchema(): TableSchema;
}

/**
 * Create a model definition with fluent API
 */
function createModelDefinition<T extends ModelProperties>(
  tableName: string,
  properties: T,
  schemaName?: string,
): ModelDefinition<T> {
  let indexes: IndexDefinition[] = [];

  const definition: ModelDefinition<T> = {
    _tableName: tableName,
    _properties: properties,
    _indexes: indexes,

    indexes(indexDefs: IndexDefinition[]): ModelDefinition<T> {
      indexes = indexDefs;
      this._indexes = indexes;
      return this;
    },

    toTableSchema(): TableSchema {
      return convertModelToTableSchema(this);
    },
  };

  // Only set schema name if provided
  if (schemaName !== undefined) {
    definition._schemaName = schemaName;
  }

  return definition;
}

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

/**
 * The main model builder API - similar to @medusajs/framework/utils model
 */
export const model = {
  /**
   * Define a new model/table
   */
  define<T extends ModelProperties>(
    tableName: string,
    properties: T,
    options?: { schema?: string },
  ): ModelDefinition<T> {
    return createModelDefinition(tableName, properties, options?.schema);
  },

  // Column type builders

  /** Create an ID column (text with optional prefix for ID generation) */
  id(options?: { prefix?: string }): IdColumnBuilder {
    return new IdColumnBuilder(options);
  },

  /** Create a text column */
  text(): TextColumnBuilder {
    return new TextColumnBuilder();
  },

  /** Create a varchar column with optional length */
  varchar(length?: number): VarcharColumnBuilder {
    return new VarcharColumnBuilder(length);
  },

  /** Create an integer number column */
  number(): NumberColumnBuilder {
    return new NumberColumnBuilder();
  },

  /** Create a decimal/numeric column */
  decimal(precision?: number, scale?: number): DecimalColumnBuilder {
    return new DecimalColumnBuilder(precision, scale);
  },

  /** Create a boolean column */
  boolean(): BooleanColumnBuilder {
    return new BooleanColumnBuilder();
  },

  /** Create a timestamp column */
  timestamp(options?: { withTimezone?: boolean }): TimestampColumnBuilder {
    return new TimestampColumnBuilder(options);
  },

  /** Create a date column */
  date(): DateColumnBuilder {
    return new DateColumnBuilder();
  },

  /** Create a time column */
  time(): TimeColumnBuilder {
    return new TimeColumnBuilder();
  },

  /** Create a JSON/JSONB column */
  json(options?: { binary?: boolean }): JsonColumnBuilder {
    return new JsonColumnBuilder(options);
  },

  /** Create an enum column */
  enum(enumNameOrValues: string | string[]): EnumColumnBuilder {
    return new EnumColumnBuilder(enumNameOrValues);
  },

  /** Create a UUID column */
  uuid(): UuidColumnBuilder {
    return new UuidColumnBuilder();
  },

  /** Create a bytea (binary) column */
  bytea(): ByteaColumnBuilder {
    return new ByteaColumnBuilder();
  },

  // Relation builders

  /**
   * Create a belongsTo relation (creates a foreign key column)
   * @param target - A function returning the target model or the model itself
   * @param options - Relation options
   */
  belongsTo(
    target: ModelReference,
    options?: BelongsToOptions,
  ): BelongsToBuilder {
    return new BelongsToBuilder(createLazyReference(target), options);
  },

  /**
   * Create a hasMany relation (no column created - inverse side)
   * @param target - A function returning the target model or the model itself
   * @param options - Relation options including mappedBy
   */
  hasMany(target: ModelReference, options: HasManyOptions): HasManyBuilder {
    return new HasManyBuilder(createLazyReference(target), options);
  },

  /**
   * Create a hasOne relation (no column created - inverse side)
   * @param target - A function returning the target model or the model itself
   * @param options - Relation options including mappedBy
   */
  hasOne(target: ModelReference, options: HasManyOptions): HasOneBuilder {
    return new HasOneBuilder(createLazyReference(target), options);
  },
};

export default model;
