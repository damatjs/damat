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
  BelongsToBuilder,
  HasManyBuilder,
  HasOneBuilder,
  ModelReference,
  InferModelProperties,
  createLazyReference,
} from "../properties";
import { EnumBuilder } from "../properties/enum";
import {
  BelongsToOptions,
  HasManyOptions,
  ModelDefinition,
  ModelProperties,
} from "@/types";
import { createModelDefinition } from "./createModelDefinition";

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
  enum(enumType: EnumBuilder): EnumColumnBuilder {
    return new EnumColumnBuilder(enumType);
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
   * Create a belongsTo relation (creates a foreign key column).
   *
   * Pass the target model directly or as a lazy arrow for circular references:
   *   - `model.belongsTo(UserSchema)`            — direct
   *   - `model.belongsTo(() => UserSchema)`       — lazy (no annotation needed)
   *
   * The returned builder is typed `BelongsToBuilder<T>` where `T` is the
   * target model's property map, inferred automatically.
   */
  belongsTo<R extends ModelReference>(
    target: R,
    options?: BelongsToOptions,
  ): BelongsToBuilder<InferModelProperties<R>> {
    return new BelongsToBuilder<InferModelProperties<R>>(
      createLazyReference(target as ModelReference<ModelProperties>),
      options,
    );
  },

  /**
   * Create a hasMany relation (no column created - inverse side).
   *
   * Pass the target model directly or as a lazy arrow for circular references:
   *   - `model.hasMany(OrderSchema, { mappedBy: 'user' })`
   *   - `model.hasMany(() => OrderSchema, { mappedBy: 'user' })`  — lazy
   *
   * The returned builder is typed `HasManyBuilder<T>` where `T` is the
   * target model's property map, inferred automatically.
   */
  hasMany<R extends ModelReference>(
    target: R,
    options?: HasManyOptions,
  ): HasManyBuilder<InferModelProperties<R>> {
    return new HasManyBuilder<InferModelProperties<R>>(
      createLazyReference(target as ModelReference<ModelProperties>),
      options,
    );
  },

  /**
   * Create a hasOne relation (no column created - inverse side).
   *
   * Pass the target model directly or as a lazy arrow for circular references:
   *   - `model.hasOne(ProfileSchema, { mappedBy: 'account' })`
   *   - `model.hasOne(() => ProfileSchema, { mappedBy: 'account' })`  — lazy
   *
   * The returned builder is typed `HasOneBuilder<T>` where `T` is the
   * target model's property map, inferred automatically.
   */
  hasOne<R extends ModelReference>(
    target: R,
    options?: HasManyOptions,
  ): HasOneBuilder<InferModelProperties<R>> {
    return new HasOneBuilder<InferModelProperties<R>>(
      createLazyReference(target as ModelReference<ModelProperties>),
      options,
    );
  },
};

export default model;
