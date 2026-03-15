import { HasManyOptions } from "@/types";
import { RelationBuilder } from "./base";

/**
 * HasOne relation builder - does not create a foreign key column
 */
export class HasOneBuilder extends RelationBuilder {
  constructor(target: () => string, options: HasManyOptions) {
    super("hasOne", target);
    this._mappedBy = options.mappedBy;
  }

  createsForeignKey(): boolean {
    return false;
  }

  getForeignKeyColumn(): undefined {
    return undefined;
  }
}
