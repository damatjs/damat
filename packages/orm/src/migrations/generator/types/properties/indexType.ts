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
