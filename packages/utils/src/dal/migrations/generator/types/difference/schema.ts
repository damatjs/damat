import { SchemaChange } from "./changes";

/**
 * Result of comparing two schemas
 */
export interface SchemaDiff {
    /** Whether there are any changes */
    hasChanges: boolean;
    /** List of changes to apply */
    changes: SchemaChange[];
    /** Warnings about potential data loss or issues */
    warnings: string[];
}
