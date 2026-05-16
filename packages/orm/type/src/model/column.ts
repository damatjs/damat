/**
 * PostgreSQL column data types (exact SQL type names as defined in PostgreSQL docs)
 */
export type ColumnType =
  // Numeric types
  | "smallint"
  | "integer"
  | "bigint"
  | "decimal"
  | "numeric"
  | "real"
  | "double precision"
  | "smallserial"
  | "serial"
  | "bigserial"
  // Monetary
  | "money"
  // Character types
  | "character"
  | "character varying"
  | "text"
  // Binary
  | "bytea"
  // Date/Time types
  | "timestamp without time zone"
  | "timestamp with time zone"
  | "date"
  | "time without time zone"
  | "time with time zone"
  | "interval"
  // Boolean
  | "boolean"
  // Enumerated (user-defined enum)
  | "enum"
  // Geometric types
  | "point"
  | "line"
  | "lseg"
  | "box"
  | "path"
  | "polygon"
  | "circle"
  // Network address types
  | "cidr"
  | "inet"
  | "macaddr"
  | "macaddr8"
  // Bit string types
  | "bit"
  | "bit varying"
  // Text search types
  | "tsvector"
  | "tsquery"
  // UUID
  | "uuid"
  // XML
  | "xml"
  // JSON types
  | "json"
  | "jsonb"
  | "jsonpath"
  // Range types
  | "int4range"
  | "int8range"
  | "numrange"
  | "tsrange"
  | "tstzrange"
  | "daterange"
  // Multirange types
  | "int4multirange"
  | "int8multirange"
  | "nummultirange"
  | "tsmultirange"
  | "tstzmultirange"
  | "datemultirange"
  // Object identifier types
  | "oid"
  | "pg_lsn"
  | "pg_snapshot";

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
  /** Length for character varying / character, precision for numeric, dimensions for embedding */
  length?: number;
  /** Scale for numeric (digits after decimal point) */
  scale?: number;
  /** Whether column allows NULL */
  nullable: boolean;
  /** Default value expression */
  default?: string;
  /** Is this column unique */
  unique: boolean;
  /** Enum type name (references a named EnumBuilder) */
  enum?: string;
  /** Whether the column is an array type */
  array?: boolean;
  /** Database field name (if different from property name) */
  fieldName?: string;
  /** Whether the column is auto-incrementing (serial / bigserial / smallserial) */
  autoincrement?: boolean;
}
