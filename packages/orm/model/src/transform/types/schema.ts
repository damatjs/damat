import { BelongsToBuilder, ColumnBuilder, HasManyBuilder, HasOneBuilder } from '../properties';
import { IndexDefinition } from './indexType';
import { TableSchema } from './table';

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
