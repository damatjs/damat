import { ForeignKeyAction, ForeignKeySchema, ForeignKeySchemaMatch } from "@/types";

/**
 * Base ForeignKey builder
 */
export abstract class ForeignKeyBuilder {
  protected _name: string;
  protected _columns: string[];
  protected _referencedTable: string;
  protected _referencedColumns: string[];
  protected _onDelete?: ForeignKeyAction;
  protected _onUpdate?: ForeignKeyAction;
  protected _deferrable?: boolean;
  protected _initiallyDeferred?: boolean;
  protected _match?: ForeignKeySchemaMatch;
  protected _unique?: boolean;
  protected _nullable?: boolean;


  constructor(
    { name, referencedTable, columns, referencedColumns }: {
      name: string,
      columns?: string[],
      referencedTable: string,
      referencedColumns?: string[],
    }) {
    this._name = name;
    this._columns = columns ? columns : [`${referencedTable}_id`];
    this._referencedTable = referencedTable;
    this._referencedColumns = referencedColumns ? referencedColumns : [`id`]
  }


  /** Set on delete action */
  onDelete(action: ForeignKeyAction): this {
    this._onDelete = action;
    return this;
  }

  /** Set on update action */
  onUpdate(action: ForeignKeyAction): this {
    this._onUpdate = action;
    return this;
  }

  /** Mark relation as nullable */
  unique(): this {
    this._unique = true;
    return this;
  }


  /** Mark relation as nullable */
  deferrable(): this {
    this._deferrable = true;
    return this;
  }

  /** Mark relation as nullable */
  initiallyDeferred(): this {
    this._initiallyDeferred = true;
    return this;
  }
  /** Mark relation as nullable */
  match(data: ForeignKeySchemaMatch): this {
    this._match = data;
    return this;
  }

  /** Convert to ColumnSchema */
  toSchema(): ForeignKeySchema {
    const schema: ForeignKeySchema = {
      name: this._name,
      columns: this._columns,
      referencedColumns: this._referencedColumns,
      referencedTable: this._referencedTable
    };

    // Only add optional properties if they have values
    if (this._onDelete !== undefined) {
      schema.onDelete = this._onDelete;
    }
    if (this._onUpdate !== undefined) {
      schema.onUpdate = this._onUpdate;
    }
    if (this._unique !== undefined) {
      schema.unique = this._unique;
    }
    if (this._deferrable !== undefined) {
      schema.deferrable = this._deferrable;
    }
    if (this._initiallyDeferred !== undefined) {
      schema.initiallyDeferred = this._initiallyDeferred;
    }
    if (this._match !== undefined) {
      schema.match = this._match;
    }

    return schema;
  }


}
