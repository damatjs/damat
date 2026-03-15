import {
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
} from "../properties/column";
import {
  BelongsToBuilder,
  HasManyBuilder,
  HasOneBuilder,
  ModelReference,
  createLazyReference,
} from "../properties/foreignKeys";
import { BelongsToOptions, HasManyOptions, ModelDefinition, ModelProperties } from '../types';
import { createModelDefinition } from './createModelDefinition';


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
