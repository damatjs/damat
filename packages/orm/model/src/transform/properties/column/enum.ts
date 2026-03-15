import { ColumnBuilder } from './base';

/**
 * Enum column builder
 */
export class EnumColumnBuilder extends ColumnBuilder {
  constructor(enumNameOrValues: string | string[]) {
    super("enum");
    if (Array.isArray(enumNameOrValues)) {
      this._enumValues = enumNameOrValues;
    } else {
      this._enumName = enumNameOrValues;
    }
  }

  /** Set enum name */
  enumName(name: string): this {
    this._enumName = name;
    return this;
  }

  /** Set enum values */
  values(vals: string[]): this {
    this._enumValues = vals;
    return this;
  }
}