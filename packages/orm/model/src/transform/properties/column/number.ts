import { ColumnBuilder } from './base';

/**
 * Number column builder (integer)
 */
export class NumberColumnBuilder extends ColumnBuilder {
  constructor() {
    super("integer");
  }

  /** Use bigint instead of integer */
  bigInt(): this {
    this._type = "bigint";
    return this;
  }

  /** Use smallint instead of integer */
  smallInt(): this {
    this._type = "smallint";
    return this;
  }

  /** Use serial (auto-incrementing) */
  serial(): this {
    this._type = "serial";
    this._autoincrement = true;
    return this;
  }

  /** Use bigserial (auto-incrementing bigint) */
  bigSerial(): this {
    this._type = "bigserial";
    this._autoincrement = true;
    return this;
  }
}

/**
 * Decimal/Numeric column builder
 */
export class DecimalColumnBuilder extends ColumnBuilder {
  constructor(precision?: number, scale?: number) {
    super("decimal");
    if (precision !== undefined) {
      this._length = precision;
    }
    if (scale !== undefined) {
      this._scale = scale;
    }
  }

  /** Set precision */
  precision(p: number): this {
    this._length = p;
    return this;
  }

  /** Set scale */
  scale(s: number): this {
    this._scale = s;
    return this;
  }
}