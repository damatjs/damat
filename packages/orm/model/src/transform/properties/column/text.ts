import { ColumnBuilder } from './base';

/**
 * Text column builder
 */
export class TextColumnBuilder extends ColumnBuilder {
  constructor() {
    super("text");
  }
}

/**
 * Varchar column builder with length support
 */
export class VarcharColumnBuilder extends ColumnBuilder {
  constructor(length?: number) {
    super("varchar");
    if (length !== undefined) {
      this._length = length;
    }
  }

  /** Set max length */
  length(len: number): this {
    this._length = len;
    return this;
  }
}
