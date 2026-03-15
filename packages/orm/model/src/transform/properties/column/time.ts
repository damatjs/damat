import { ColumnBuilder } from './base';

/**
 * Timestamp column builder
 */
export class TimestampColumnBuilder extends ColumnBuilder {
  constructor(options?: { withTimezone?: boolean }) {
    super(options?.withTimezone ? "timestamptz" : "timestamp");
  }

  /** Use timestamp with timezone */
  withTimezone(): this {
    this._type = "timestamptz";
    return this;
  }

  /** Set default to current timestamp */
  defaultNow(): this {
    this._default = "now()";
    return this;
  }
}

/**
 * Date column builder
 */
export class DateColumnBuilder extends ColumnBuilder {
  constructor() {
    super("date");
  }

  /** Set default to current date */
  defaultNow(): this {
    this._default = "CURRENT_DATE";
    return this;
  }
}

/**
 * Time column builder
 */
export class TimeColumnBuilder extends ColumnBuilder {
  constructor() {
    super("time");
  }
}
