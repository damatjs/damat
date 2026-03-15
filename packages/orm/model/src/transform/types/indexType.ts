/**
 * Index type
 */
export type IndexType = "btree" | "hash" | "gin" | "gist" | "brin";


interface IndexColumn {
    name: string;
    order?: "ASC" | "DESC";
}

/**
 * Index definition
 */
export interface IndexSchema {
    /** Index name */
    name: string;
    /** Columns in the index */
    columns: IndexColumn[];
    /** Whether index is unique */
    unique: boolean;
    /** Index type */
    type?: IndexType | undefined;
    /** Partial index condition */
    where?: string | undefined;
}


/**
 * Index column configuration
 */
export interface IndexColumnConfig {
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