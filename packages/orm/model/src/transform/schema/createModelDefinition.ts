import { TableSchema, IndexDefinition, ModelDefinition, ModelProperties } from '@/types';
import { convertModelToTableSchema } from './convertModelToTable';

/**
 * Create a model definition with fluent API
 */
export function createModelDefinition<T extends ModelProperties>(
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
