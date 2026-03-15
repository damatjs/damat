import { ColumnBuilder } from './base';
import { ColumnSchema } from "@/types";
/**
 * ID column builder with prefix support
 */
export class IdColumnBuilder extends ColumnBuilder {
  protected _prefix?: string;

  constructor(options?: { prefix?: string }) {
    super("text");
    if (options?.prefix !== undefined) {
      this._prefix = options.prefix;
    }
    // ID columns default to not nullable
    this._nullable = false;
  }

  toSchema(): ColumnSchema {
    // Build schema with prefix-based default if provided
    if (this._prefix) {
      this._default = `generate_id('${this._prefix}')`;
    }
    return super.toSchema();
  }
}