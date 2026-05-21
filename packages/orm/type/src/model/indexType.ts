/**
 * Index type
 */
export type IndexType = "btree" | "hash" | "gin" | "gist" | "brin";


export interface IndexColumn {
    name: string;
    order?: "ASC" | "DESC";
}

/**
 * Index Schema
 */
export interface IndexSchema {
    /** Index name */
    name?: string | undefined;
    /** Columns in the index */
    columns: (string | IndexColumn)[];
    /** Whether index is unique */
    unique?: boolean | undefined;
    /** Index type */
    type?: IndexType | undefined;
    /** Partial index condition */
    where?: string | undefined;
    /** Whether index is concurrently created */
    concurrently?: boolean | undefined;
}