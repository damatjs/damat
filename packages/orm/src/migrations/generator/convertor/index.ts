// Export column builders
export {
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
} from "./properties/base";

// Export index builders and types
export {
    IndexBuilder,
    index,
    convertIndexDefinition,
} from "./properties/indexes";

export type { IndexDefinition } from "./properties/indexes";

// Export relation builders and types
export {
    BelongsToBuilder,
    HasManyBuilder,
    HasOneBuilder,
    resolveModelReference,
    createLazyReference,
} from "./properties/foreignKeys";

export type {
    RelationType,
    BelongsToOptions,
    HasManyOptions,
    RelationDefinition,
    ModelReference,
} from "./properties/foreignKeys";

// Export model builder and converter
export { model, convertModelToTableSchema } from "./schema/extract";

export type {
    PropertyValue,
    ModelProperties,
    ModelDefinition,
} from "./schema/extract";

// Re-export all from properties index
export * from "./properties";
