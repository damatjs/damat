import {
  BelongsToBuilder,
  ColumnBuilder,
  HasManyBuilder,
  HasOneBuilder,
} from "@/properties";

/**
 * Property types that can be used in model definition
 */
export type PropertyValue =
  ColumnBuilder | BelongsToBuilder | HasManyBuilder | HasOneBuilder;

/**
 * Model properties definition
 */
export type ModelProperties = Record<string, PropertyValue>;
