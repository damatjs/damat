import { HasManyOptions } from '../../types/foreignKey';
import { RelationBuilder } from './base';

/**
 * HasMany relation builder - does not create a foreign key column
 */
export class HasManyBuilder extends RelationBuilder {
  constructor(target: () => string, options: HasManyOptions) {
    super("hasMany", target);
    this._mappedBy = options.mappedBy;
  }

  createsForeignKey(): boolean {
    return false;
  }

  getForeignKeyColumn(): undefined {
    return undefined;
  }
}