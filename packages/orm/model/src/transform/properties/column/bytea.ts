import { ColumnBuilder } from './base';

/**
 * Bytea (binary) column builder
 */
export class ByteaColumnBuilder extends ColumnBuilder {
  constructor() {
    super("bytea");
  }
}
