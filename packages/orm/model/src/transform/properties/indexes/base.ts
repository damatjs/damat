import { convertIndexDefinition } from "./convertIndex";
import { IndexSchema, IndexType, IndexColumnConfig, IndexDefinition } from "@/types";

/**
 * Index builder for fluent API
 */
export class IndexBuilder {
  private _columns: IndexColumnConfig[] = [];
  private _unique: boolean = false;
  private _type?: IndexType;
  private _where?: string;
  private _name?: string;

  constructor(columns: (string | IndexColumnConfig)[]) {
    this._columns = columns.map((col) =>
      typeof col === "string" ? { name: col } : col,
    );
  }

  /** Mark index as unique */
  unique(): this {
    this._unique = true;
    return this;
  }

  /** Set index type */
  type(indexType: IndexType): this {
    this._type = indexType;
    return this;
  }

  /** Set partial index WHERE clause */
  where(condition: string): this {
    this._where = condition;
    return this;
  }

  /** Set custom index name */
  name(indexName: string): this {
    this._name = indexName;
    return this;
  }

  /** Convert to IndexDefinition */
  toDefinition(): IndexDefinition {
    const def: IndexDefinition = {
      on: this._columns,
      unique: this._unique,
    };

    if (this._type !== undefined) {
      def.type = this._type;
    }
    if (this._where !== undefined) {
      def.where = this._where;
    }
    if (this._name !== undefined) {
      def.name = this._name;
    }

    return def;
  }

  /** Convert to IndexSchema */
  toSchema(tableName: string, indexNumber: number): IndexSchema {
    return convertIndexDefinition(tableName, this.toDefinition(), indexNumber);
  }
}
