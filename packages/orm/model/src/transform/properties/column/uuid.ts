import { ColumnBuilder } from './base';

/**
 * UUID column builder
 */
export class UuidColumnBuilder extends ColumnBuilder {
  constructor() {
    super("uuid");
  }

  /** Set default to generate UUID */
  defaultGenerate(): this {
    this._default = "gen_random_uuid()";
    return this;
  }
}
