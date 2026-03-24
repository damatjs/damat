import { HasManyOptions, ModelProperties } from "@/types";
import { RelationBuilder } from "./base";

/**
 * HasOne relation builder - does not create a foreign key column.
 *
 * The type parameter `T` carries the target model's property map so that
 * `ModelDefinition._properties.someRelation` is typed as
 * `HasOneBuilder<TargetModel['_properties']>` rather than the erased
 * `HasOneBuilder<ModelProperties>`.
 *
 * The `mappedBy` option names the property on the target model that holds
 * the belongsTo pointing back to this model. Optional — when omitted the
 * relation is still recorded in the schema but no inverse validation is run.
 */
export class HasOneBuilder<
  T extends ModelProperties = ModelProperties,
> extends RelationBuilder {
  /** Phantom type — never accessed at runtime, only used for TS inference */
  declare readonly _targetProperties: T;

  constructor(target: () => string, options?: HasManyOptions) {
    super("hasOne", target);
    if (options?.mappedBy !== undefined) {
      this._mappedBy = options.mappedBy;
    }
  }

  createsForeignKey(): boolean {
    return false;
  }

  getForeignKeyColumn(): undefined {
    return undefined;
  }
}
