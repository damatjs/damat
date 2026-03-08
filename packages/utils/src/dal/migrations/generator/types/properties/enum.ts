/**
 * Enum type definition
 */
export interface EnumSchema {
    schema?: string;
    /** Enum name in PostgreSQL */
    name: string;
    /** Enum values */
    values: string[];
}
