import { ColumnSchema } from "./column";
import { IndexSchema } from "./indexType";
import { ForeignKeySchema } from "./foreignKey";

/**
 * Complete table schema definition
 */
export interface TableSchema {
    /** Table name */
    name: string;
    /** Schema name (default: public) */
    schema?: string;
    /** Column definitions */
    columns: ColumnSchema[];
    /** Index definitions */
    indexes: IndexSchema[];
    /** Foreign key definitions */
    foreignKeys: ForeignKeySchema[];
    /** Primary key columns (composite keys supported) */
    primaryKey: PrimaryKeySchema;
}

export interface PrimaryKeySchema {
    name: string;          // this is the index/constraint name in DB
    columns: string[];
};