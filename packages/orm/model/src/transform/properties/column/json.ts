import { ColumnBuilder } from './base';

/**
 * JSON column builder
 */
export class JsonColumnBuilder extends ColumnBuilder {
  constructor(options?: { binary?: boolean }) {
    super(options?.binary ? "jsonb" : "json");
  }

  /** Use JSONB (binary JSON) for better indexing */
  binary(): this {
    this._type = "jsonb";
    return this;
  }
}
