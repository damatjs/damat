import { ColumnType, ColumnSchema, IndexSchema, ForeignKeySchema, TableSchema, EnumSchema } from "../properties";

/**
 * Types of changes that can be detected
 */
export type ChangeType =
    | "create_table"
    | "drop_table"
    | "rename_table"
    | "add_column"
    | "drop_column"
    | "alter_column"
    | "rename_column"
    | "add_index"
    | "drop_index"
    | "add_foreign_key"
    | "drop_foreign_key"
    | "create_enum"
    | "drop_enum"
    | "alter_enum";

/**
 * Base interface for all schema changes
 */
export interface BaseSchemaChange {
    /** Type of change */
    type: ChangeType;
    /** Table this change applies to (if applicable) */
    tableName?: string;
    /** Priority for ordering (lower = first) */
    priority: number;
}

/**
 * Create a new table
 */
export interface CreateTableChange extends BaseSchemaChange {
    type: "create_table";
    table: TableSchema;
}

/**
 * Drop an existing table
 */
export interface DropTableChange extends BaseSchemaChange {
    type: "drop_table";
    tableName: string;
    cascade?: boolean;
}

/**
 * Rename a table
 */
export interface RenameTableChange extends BaseSchemaChange {
    type: "rename_table";
    oldName: string;
    newName: string;
}

/**
 * Add a new column
 */
export interface AddColumnChange extends BaseSchemaChange {
    type: "add_column";
    tableName: string;
    column: ColumnSchema;
}

/**
 * Drop an existing column
 */
export interface DropColumnChange extends BaseSchemaChange {
    type: "drop_column";
    tableName: string;
    columnName: string;
}

/**
 * Alter an existing column (type, nullable, default, etc.)
 */
export interface AlterColumnChange extends BaseSchemaChange {
    type: "alter_column";
    tableName: string;
    columnName: string;
    changes: {
        type?: { from: ColumnType; to: ColumnType };
        nullable?: { from: boolean; to: boolean };
        default?: { from?: string | undefined; to?: string | undefined };
        length?: { from?: number | undefined; to?: number | undefined };
    };
}

/**
 * Rename a column
 */
export interface RenameColumnChange extends BaseSchemaChange {
    type: "rename_column";
    tableName: string;
    oldName: string;
    newName: string;
}

/**
 * Add an index
 */
export interface AddIndexChange extends BaseSchemaChange {
    type: "add_index";
    tableName: string;
    index: IndexSchema;
}

/**
 * Drop an index
 */
export interface DropIndexChange extends BaseSchemaChange {
    type: "drop_index";
    tableName: string;
    indexName: string;
}

/**
 * Add a foreign key constraint
 */
export interface AddForeignKeyChange extends BaseSchemaChange {
    type: "add_foreign_key";
    tableName: string;
    foreignKey: ForeignKeySchema;
}

/**
 * Drop a foreign key constraint
 */
export interface DropForeignKeyChange extends BaseSchemaChange {
    type: "drop_foreign_key";
    tableName: string;
    constraintName: string;
}

/**
 * Create an enum type
 */
export interface CreateEnumChange extends BaseSchemaChange {
    type: "create_enum";
    enumDef: EnumSchema;
}

/**
 * Drop an enum type
 */
export interface DropEnumChange extends BaseSchemaChange {
    type: "drop_enum";
    enumName: string;
}

/**
 * Alter an enum (add/remove values)
 */
export interface AlterEnumChange extends BaseSchemaChange {
    type: "alter_enum";
    enumName: string;
    addValues?: string[];
    /** Note: PostgreSQL doesn't support removing enum values easily */
    removeValues?: string[];
}

/**
 * Union type of all possible schema changes
 */
export type SchemaChange =
    | CreateTableChange
    | DropTableChange
    | RenameTableChange
    | AddColumnChange
    | DropColumnChange
    | AlterColumnChange
    | RenameColumnChange
    | AddIndexChange
    | DropIndexChange
    | AddForeignKeyChange
    | DropForeignKeyChange
    | CreateEnumChange
    | DropEnumChange
    | AlterEnumChange;
