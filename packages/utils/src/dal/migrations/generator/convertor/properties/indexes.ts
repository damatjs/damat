import { IndexSchema, IndexType } from "../../types/properties/indexType";

/**
 * Index column configuration
 */
interface IndexColumnConfig {
  name: string;
  order?: "ASC" | "DESC";
}

/**
 * Index definition for model.indexes()
 */
export interface IndexDefinition {
  /** Columns to index - can be string[] or column config objects */
  on: (string | IndexColumnConfig)[];
  /** Whether this is a unique index */
  unique?: boolean;
  /** Index type (btree, hash, gin, gist, brin) */
  type?: IndexType;
  /** Partial index WHERE clause */
  where?: string;
  /** Custom index name (auto-generated if not provided) */
  name?: string;
}

/**
 * Convert user-friendly index definition to IndexSchema
 */
export function convertIndexDefinition(
  tableName: string,
  index: IndexDefinition,
  indexNumber: number,
): IndexSchema {
  const columns = index.on.map((col) => {
    if (typeof col === "string") {
      return { name: col };
    }
    const result: { name: string; order?: "ASC" | "DESC" } = { name: col.name };
    if (col.order !== undefined) {
      result.order = col.order;
    }
    return result;
  });

  const columnNames = columns.map((c) => c.name).join("_");
  const uniquePrefix = index.unique ? "uniq_" : "idx_";
  const generatedName = `${uniquePrefix}${tableName}_${columnNames}_${indexNumber}`;

  const schema: IndexSchema = {
    name: index.name ?? generatedName,
    columns,
    unique: index.unique ?? false,
  };

  if (index.type !== undefined) {
    schema.type = index.type;
  }
  if (index.where !== undefined) {
    schema.where = index.where;
  }

  return schema;
}

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

/**
 * Create a new index builder
 */
export function index(columns: (string | IndexColumnConfig)[]): IndexBuilder {
  return new IndexBuilder(columns);
}
