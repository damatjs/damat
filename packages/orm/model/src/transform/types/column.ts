/**
 * PostgreSQL column data types
 */
export type ColumnType =
    | "uuid"
    | "text"
    | "varchar"
    | "integer"
    | "bigint"
    | "smallint"
    | "boolean"
    | "timestamp"
    | "timestamptz"
    | "date"
    | "time"
    | "json"
    | "jsonb"
    | "decimal"
    | "numeric"
    | "real"
    | "double precision"
    | "bytea"
    | "serial"
    | "bigserial"
    | "enum"
    | string; // Allow custom types

/**
 * Column definition in a table schema
 */
export interface ColumnSchema {
    /** Column name */
    name: string;
    /** Data type */
    type: ColumnType;
    /** Is this a primary key */
    primaryKey: boolean;
    /** Length for varchar, precision for numeric */
    length?: number;
    /** Scale for numeric/decimal */
    scale?: number;
    /** Whether column allows NULL */
    nullable: boolean;
    /** Default value expression */
    default?: string;
    /** Is this column unique */
    unique: boolean;
    /** Enum name for PostgreSQL */
    enumName?: string;
    /** Enum values if type is enum */
    enumValues?: string[];
    /** Array type */
    array?: boolean;
    /** Database field name (if different from property name) */
    fieldName?: string;
    /** For serial/bigserial and generate identity */
    autoincrement?: boolean,
}
